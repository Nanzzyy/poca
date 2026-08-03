"""Conversation state machine — manages multi-turn context without LLM.

Tracks where the user is in a multi-step flow (plan creation, editing)
and returns clarification templates when info is missing (0 LLM tokens).
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from src.ai.local.intent_classifier import Intent
from src.ai.local.templates import ResponseTemplates


class ConversationState(Enum):
    IDLE = "idle"
    AWAITING_LOCATION = "awaiting_location"
    AWAITING_DAYS = "awaiting_days"
    AWAITING_BUDGET = "awaiting_budget"
    AWAITING_PEOPLE = "awaiting_people"
    AWAITING_PLAN_CONFIRM = "awaiting_plan_confirm"
    PLAN_EDITING = "plan_editing"
    FREE_CHAT = "free_chat"


class StateManager:
    """Deterministic state transitions for conversation context."""

    def get_state(self, context_data: dict) -> ConversationState:
        raw = context_data.get("state", "idle")
        try:
            return ConversationState(raw)
        except ValueError:
            return ConversationState.IDLE

    def transition(
        self,
        current: ConversationState,
        intent: Intent,
        params: dict,
        context: dict,
    ) -> tuple[ConversationState, str | None, dict]:
        """Determine next state and clarification question.

        Returns:
            (new_state, clarification_text_or_None, updated_params)
            If clarification is None → caller should proceed with action.
            If clarification is a string → return it directly to user (0 LLM tokens).
        """
        if intent == Intent.PLAN_CANCEL:
            return ConversationState.IDLE, None, params

        # ── IDLE state ──────────────────────────────────────────────
        if current == ConversationState.IDLE:
            return self._handle_idle(intent, params, context)

        # ── AWAITING_* states (plan creation flow) ──────────────────
        if current in (
            ConversationState.AWAITING_LOCATION,
            ConversationState.AWAITING_DAYS,
            ConversationState.AWAITING_BUDGET,
            ConversationState.AWAITING_PEOPLE,
        ):
            return self._handle_plan_flow(current, intent, params, context)

        # ── AWAITING_PLAN_CONFIRM ───────────────────────────────────
        if current == ConversationState.AWAITING_PLAN_CONFIRM:
            return self._handle_plan_confirm(intent, params, context)

        # ── PLAN_EDITING ────────────────────────────────────────────
        if current == ConversationState.PLAN_EDITING:
            return self._handle_plan_edit(intent, params, context)

        # ── FREE_CHAT ───────────────────────────────────────────────
        if current == ConversationState.FREE_CHAT:
            return self._handle_free_chat(intent, params, context)

        return ConversationState.IDLE, None, params

    # ── State handlers ──────────────────────────────────────────────

    def _handle_idle(
        self, intent: Intent, params: dict, context: dict
    ) -> tuple[ConversationState, str | None, dict]:
        if intent == Intent.PLAN_CREATE:
            return self._start_plan_flow(params)

        if intent == Intent.RECOMMEND:
            if not params.get("location"):
                return (
                    ConversationState.AWAITING_LOCATION,
                    ResponseTemplates.clarification("location"),
                    {**params, "_pending_intent": "recommend"},
                )
            return ConversationState.FREE_CHAT, None, params

        if intent in (Intent.BUDGET_QUERY, Intent.HOTEL_QUERY, Intent.FOOD_QUERY, Intent.TRANSPORT_QUERY):
            return ConversationState.FREE_CHAT, None, params

        if intent == Intent.PLAN_EDIT:
            if not context.get("last_plan"):
                return (
                    ConversationState.IDLE,
                    ResponseTemplates.edit_response("no_plan"),
                    params,
                )
            return ConversationState.PLAN_EDITING, None, params

        if intent == Intent.PLAN_CANCEL:
            return ConversationState.IDLE, None, params

        return ConversationState.FREE_CHAT, None, params

    def _start_plan_flow(
        self, params: dict
    ) -> tuple[ConversationState, str | None, dict]:
        """Start plan creation, ask for missing info in order."""
        if not params.get("location"):
            return (
                ConversationState.AWAITING_LOCATION,
                ResponseTemplates.clarification("location"),
                params,
            )
        if not params.get("num_days"):
            return (
                ConversationState.AWAITING_DAYS,
                ResponseTemplates.clarification("days"),
                params,
            )
        if not params.get("budget"):
            return (
                ConversationState.AWAITING_BUDGET,
                ResponseTemplates.clarification("budget"),
                params,
            )
        # All info present → proceed to plan generation
        return ConversationState.AWAITING_PLAN_CONFIRM, None, params

    def _handle_plan_flow(
        self,
        current: ConversationState,
        intent: Intent,
        params: dict,
        context: dict,
    ) -> tuple[ConversationState, str | None, dict]:
        """Handle user providing info during plan creation flow."""
        # Merge new params with accumulated context
        merged = {**context.get("plan_params", {}), **params}

        # Check what's still missing
        if not merged.get("location"):
            return ConversationState.AWAITING_LOCATION, ResponseTemplates.clarification("location"), merged
        if not merged.get("num_days"):
            return ConversationState.AWAITING_DAYS, ResponseTemplates.clarification("days"), merged
        if not merged.get("budget"):
            return ConversationState.AWAITING_BUDGET, ResponseTemplates.clarification("budget"), merged

        # All info present → proceed
        return ConversationState.AWAITING_PLAN_CONFIRM, None, merged

    def _handle_plan_confirm(
        self, intent: Intent, params: dict, context: dict
    ) -> tuple[ConversationState, str | None, dict]:
        """User confirmed or is reviewing plan."""
        if intent == Intent.PLAN_EDIT:
            return ConversationState.PLAN_EDITING, None, params
        if intent == Intent.PLAN_CREATE:
            return self._start_plan_flow(params)
        return ConversationState.FREE_CHAT, None, params

    def _handle_plan_edit(
        self, intent: Intent, params: dict, context: dict
    ) -> tuple[ConversationState, str | None, dict]:
        """Handle plan editing flow."""
        if intent == Intent.PLAN_EDIT:
            field = params.get("edit_field")
            # Check if we have enough info to rebuild
            has_changes = any(
                params.get(k)
                for k in ("new_days", "new_budget", "new_people", "new_location", "new_category")
            )
            if not has_changes:
                if field:
                    # Service will ask for value and persist pending_edit.
                    return ConversationState.PLAN_EDITING, None, params
                return (
                    ConversationState.PLAN_EDITING,
                    ResponseTemplates.edit_response("ambiguous"),
                    params,
                )
            # Merge changes with last plan params
            last_plan = context.get("last_plan", {})
            merged = {
                "location": params.get("new_location", last_plan.get("location")),
                "num_days": params.get("new_days", last_plan.get("num_days")),
                "budget": params.get("new_budget", last_plan.get("budget_requested")),
                "people": params.get("new_people", last_plan.get("people")),
                "category": params.get("new_category"),
            }
            return ConversationState.AWAITING_PLAN_CONFIRM, None, merged

        if intent == Intent.PLAN_CREATE:
            return self._start_plan_flow(params)

        if intent == Intent.PLAN_CANCEL:
            return ConversationState.IDLE, None, params

        return ConversationState.FREE_CHAT, None, params

    def _handle_free_chat(
        self, intent: Intent, params: dict, context: dict
    ) -> tuple[ConversationState, str | None, dict]:
        """Handle free chat state — can transition to plan flow."""
        if intent == Intent.PLAN_CREATE:
            return self._start_plan_flow(params)
        if intent == Intent.PLAN_EDIT and context.get("last_plan"):
            return ConversationState.PLAN_EDITING, None, params
        if intent == Intent.PLAN_CANCEL:
            return ConversationState.IDLE, None, params
        return ConversationState.FREE_CHAT, None, params

    # ── Context helpers ─────────────────────────────────────────────

    def save_state(self, context_data: dict, state: ConversationState, params: dict | None = None) -> dict:
        """Update context_data with new state and optional plan params."""
        updated = {**context_data, "state": state.value}
        if params:
            updated["plan_params"] = {**(context_data.get("plan_params") or {}), **params}
        return updated
