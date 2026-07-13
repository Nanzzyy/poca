"""Quick API smoke test."""
import json, sys, asyncio, httpx

BASE = "http://localhost:8002"

async def test():
    async with httpx.AsyncClient(base_url=BASE) as c:
        # Health
        r = await c.get("/health")
        assert r.status_code == 200, f"Health: {r.status_code}"
        print(f"✓ Health: {r.json()['status']}")

        # Login
        r = await c.post("/api/v1/auth/login", json={"email": "demo@poca.app", "password": "demo123"})
        assert r.status_code == 200, f"Login: {r.status_code}"
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✓ Login OK")

        # Get profile
        r = await c.get("/api/v1/users/me", headers=headers)
        assert r.status_code == 200
        print(f"✓ Profile: {r.json()['username']}")

        # Search destinations
        r = await c.get("/api/v1/destinations", params={"q": "bali"})
        assert r.status_code == 200
        dests = r.json()["items"]
        assert len(dests) > 0, "No destinations found"
        print(f"✓ Search: found {len(dests)} destinations")

        dest_id = dests[0]["id"]
        print(f"  Using destination: {dests[0]['name']} ({dest_id})")

        # Get destination detail
        r = await c.get(f"/api/v1/destinations/{dest_id}")
        assert r.status_code == 200
        print(f"✓ Detail: {r.json()['name']} (rating {r.json()['rating_avg']})")

        # Categories
        r = await c.get("/api/v1/destinations/categories/all")
        assert r.status_code == 200
        print(f"✓ Categories: {len(r.json())}")

        # Map markers
        r = await c.get("/api/v1/map/markers", params={"sw_lat": -10, "sw_lng": 114, "ne_lat": -7, "ne_lng": 116})
        assert r.status_code == 200
        print(f"✓ Map markers: {len(r.json()['features'])} in bounds")

        # Post review
        r = await c.post(f"/api/v1/destinations/{dest_id}/reviews", headers=headers, json={
            "rating": 5, "title": "Amazing!", "content": "Best place ever!",
            "travel_tips": "Go early morning"
        })
        assert r.status_code == 201, f"Review: {r.status_code} {r.text}"
        print(f"✓ Review posted: {r.json()['rating']}/5")

        # Get reviews
        r = await c.get(f"/api/v1/destinations/{dest_id}/reviews")
        assert r.status_code == 200
        print(f"✓ Reviews: {r.json()['total']} total")

        # Recommendations
        r = await c.post("/api/v1/recommendations", json={
            "travel_style": "comfort", "categories": ["pantai"],
            "preferences": {"min_rating": 4.0}
        })
        assert r.status_code == 200
        print(f"✓ Recommendations: {r.json()['total']} results")

        # Create trip
        r = await c.post("/api/v1/trips", headers=headers, json={
            "name": "Bali Trip",
            "destination_id": dest_id,
            "start_date": "2026-08-01T00:00:00",
            "end_date": "2026-08-05T00:00:00",
        })
        assert r.status_code == 201, f"Create trip: {r.status_code} {r.text[:200]}"
        trip_id = r.json()["id"]
        print(f"✓ Trip created: {r.json()['name']}")

        # Get trip
        r = await c.get(f"/api/v1/trips/{trip_id}", headers=headers)
        assert r.status_code == 200
        print(f"✓ Trip detail: {r.json()['status']}")

        # Budget
        r = await c.get(f"/api/v1/trips/{trip_id}/budget", headers=headers)
        assert r.status_code == 200
        budget = r.json()
        print(f"✓ Budget: IDR {budget['total']:,.0f}")

        # Gamification stats
        r = await c.get("/api/v1/gamification/users/me/stats", headers=headers)
        assert r.status_code == 200
        print(f"✓ Stats: Level {r.json()['level']}, XP {r.json()['xp_total']}")

        # Leaderboard
        r = await c.get("/api/v1/gamification/leaderboard")
        assert r.status_code == 200
        print(f"✓ Leaderboard: {len(r.json())} entries")

        # AI Conversation
        r = await c.post("/api/v1/ai/conversations", headers=headers, json={})
        assert r.status_code == 201
        conv_id = r.json()["id"]
        print(f"✓ Conversation created: {conv_id}")

        # Send message (may fail if no AI key configured - that's OK)
        r = await c.post(f"/api/v1/ai/conversations/{conv_id}/messages", headers=headers, json={
            "content": "Recommend me places to visit in Bali"
        })
        if r.status_code == 200:
            print(f"✓ AI response: {r.json()['content'][:50]}...")
        else:
            print(f"  AI skipped (no API key): {r.text}")

        print("\n✅ All tests passed!")

if __name__ == "__main__":
    asyncio.run(test())
