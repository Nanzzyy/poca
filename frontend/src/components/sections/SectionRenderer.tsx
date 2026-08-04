"use client";

import { Star, MapPin, Clock, DollarSign, Utensils, Landmark, TreePine, Compass, Shield, Zap, Camera, Phone, Mail, Globe, Heart, Award, Users, Home, Sun, Moon, Cloud, Umbrella } from "lucide-react";
import nextDynamic from "next/dynamic";
import { destImage } from "@/lib/utils";
import type { Destination } from "@/types";

const MapComponent = nextDynamic(() => import("@/components/map/MapView"), { ssr: false });

interface Section {
  id: string;
  section_type: string;
  title: string | null;
  order: number;
  visible: boolean;
  data: Record<string, unknown>;
}

const ICON_MAP: Record<string, React.ElementType> = {
  clock: Clock, dollar: DollarSign, "map-pin": MapPin, star: Star, info: Globe,
  sun: Sun, moon: Moon, cloud: Cloud, umbrella: Umbrella, camera: Camera,
  compass: Compass, map: MapPin, phone: Phone, mail: Mail, globe: Globe,
  heart: Heart, shield: Shield, zap: Zap, award: Award, users: Users,
  home: Home, utensils: Utensils, landmark: Landmark, tree: TreePine,
};

function IconComponent({ name, className }: { name: string; className?: string }) {
  const C = ICON_MAP[name] || Globe;
  return <C className={className} />;
}

export default function SectionRenderer({ section, dest }: { section: Section; dest: Destination }) {
  if (!section.visible) return null;

  switch (section.section_type) {
    case "rich-text":
      return <RichTextSection data={section.data} />;
    case "info-cards":
      return <InfoCardsSection data={section.data} />;
    case "image-grid":
      return <ImageGridSection data={section.data} destName={dest.name} />;
    case "timeline":
      return <TimelineSection data={section.data} />;
    case "guide-cards":
      return <GuideCardsSection data={section.data} />;
    case "cta-banner":
      return <CtaBannerSection data={section.data} />;
    case "map":
      return <MapSection dest={dest} />;
    case "reviews":
      return null; // Reviews handled separately
    default:
      return null;
  }
}


function RichTextSection({ data }: { data: Record<string, unknown> }) {
  const heading = data.heading as string;
  const body = data.body as string;
  const alignment = (data.alignment as string) || "left";

  if (!heading && !body) return null;

  return (
    <div className={`mb-8 ${alignment === "center" ? "text-center" : ""}`}>
      {heading && <h2 className="text-[20px] font-bold text-primary mb-4">{heading}</h2>}
      {body && <p className="text-[16px] leading-relaxed text-on-surface-variant whitespace-pre-wrap">{body}</p>}
    </div>
  );
}


function InfoCardsSection({ data }: { data: Record<string, unknown> }) {
  const cards = (data.cards as { icon?: string; label?: string; value?: string }[]) || [];
  if (!cards.length) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      {cards.map((card, i) => (
        <div key={i} className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/20 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <IconComponent name={card.icon || "info"} className="w-6 h-6" />
          </div>
          <div>
            <p className="text-on-surface-variant text-[10px] font-medium uppercase tracking-wider">{card.label}</p>
            <p className="text-[14px] font-bold">{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}


function ImageGridSection({ data, destName }: { data: Record<string, unknown>; destName: string }) {
  const images = (data.images as string[]) || [];
  const columns = (data.columns as number) || 3;
  if (!images.length) return null;

  return (
    <div className={`grid grid-cols-2 md:grid-cols-${columns} gap-3 mb-8`}>
      {images.map((img, i) => (
        <div key={i} className="rounded-xl overflow-hidden aspect-[4/3]">
          <img src={destImage([img], destName)} alt={`${destName} ${i + 1}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
        </div>
      ))}
    </div>
  );
}


function TimelineSection({ data }: { data: Record<string, unknown> }) {
  const heading = data.heading as string;
  const items = (data.items as { time?: string; title?: string; desc?: string }[]) || [];
  if (!items.length) return null;

  return (
    <div className="mb-8 bg-surface p-6 rounded-2xl border border-outline-variant/30">
      {heading && <h3 className="text-[20px] font-bold mb-6">{heading}</h3>}
      <div className="relative pl-6 space-y-6">
        <div style={{ position: "absolute", left: "16px", top: "0", bottom: "0", width: "2px", borderLeft: "2px dashed #c3c6d7", zIndex: 0 }} />
        {items.map((item, i) => (
          <div key={i} className="relative z-10 flex gap-4" style={{ position: "relative", zIndex: 10 }}>
            <div className={`w-8 h-8 rounded-full ${i === 0 ? "bg-primary" : "bg-surface-container"} border-4 border-white shadow-sm shrink-0`} />
            <div>
              {item.time && <span className="text-[11px] font-bold uppercase tracking-wider text-primary">{item.time}</span>}
              {item.title && <h4 className="text-[14px] font-bold mt-1">{item.title}</h4>}
              {item.desc && <p className="text-[12px] text-on-surface-variant">{item.desc}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


const GUIDE_ICON_MAP: Record<string, { icon: React.ElementType; bg: string; text: string }> = {
  food: { icon: Utensils, bg: "bg-orange-100", text: "text-orange-600" },
  customs: { icon: Landmark, bg: "bg-purple-100", text: "text-purple-600" },
  gems: { icon: TreePine, bg: "bg-emerald-100", text: "text-emerald-600" },
  transport: { icon: Compass, bg: "bg-blue-100", text: "text-blue-600" },
  safety: { icon: Shield, bg: "bg-red-100", text: "text-red-600" },
};

function GuideCardsSection({ data }: { data: Record<string, unknown> }) {
  const cards = (data.cards as { icon_type?: string; title?: string; body?: string; link_text?: string }[]) || [];
  if (!cards.length) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {cards.map((card, i) => {
        const meta = GUIDE_ICON_MAP[card.icon_type || "gems"] || GUIDE_ICON_MAP.gems;
        const Icon = meta.icon;
        return (
          <div key={i} className="group bg-surface-container-low p-6 rounded-2xl border border-outline-variant/10 hover:border-primary/30 transition-all hover:shadow-xl">
            <div className={`w-14 h-14 rounded-2xl ${meta.bg} flex items-center justify-center ${meta.text} mb-6`}>
              <Icon className="w-7 h-7" />
            </div>
            <h3 className="text-[20px] font-bold mb-4 text-on-surface">{card.title}</h3>
            <p className="text-[14px] text-on-surface-variant mb-6">{card.body}</p>
            {card.link_text && (
              <div className="pt-4 border-t border-outline-variant/20">
                <span className="text-primary font-bold text-[12px] cursor-pointer hover:underline">{card.link_text}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


function CtaBannerSection({ data }: { data: Record<string, unknown> }) {
  const heading = data.heading as string;
  const subtext = data.subtext as string;
  const buttonText = data.button_text as string;
  const buttonUrl = data.button_url as string;
  const bgColor = (data.bg_color as string) || "#1a73e8";
  const bgImage = data.bg_image as string;

  if (!heading) return null;

  const style: React.CSSProperties = bgImage
    ? { backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.55), rgba(0,0,0,0.35)), url(${bgImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundColor: bgColor };

  return (
    <div className="mb-8 rounded-2xl p-8 text-white text-center" style={style}>
      <h3 className="text-[24px] font-bold mb-2">{heading}</h3>
      {subtext && <p className="text-white/80 mb-4">{subtext}</p>}
      {buttonText && buttonUrl && (
        <a href={buttonUrl} className="inline-block px-6 py-2.5 bg-white text-on-surface rounded-xl font-bold text-[14px] hover:bg-white/90 transition-colors">
          {buttonText}
        </a>
      )}
    </div>
  );
}


function MapSection({ dest }: { dest: Destination }) {
  if (!dest.latitude || !dest.longitude) return null;

  return (
    <div className="rounded-2xl overflow-hidden h-[500px] border border-outline-variant/20 shadow-lg relative mb-8">
      {MapComponent && (
        <MapComponent
          center={[dest.latitude, dest.longitude]}
          zoom={14}
          markers={[{
            id: dest.id,
            name: dest.name,
            latitude: dest.latitude,
            longitude: dest.longitude,
            rating_avg: dest.rating_avg,
            category_name: (dest as any).category?.name,
            country: dest.country,
            city: dest.city,
          }]}
        />
      )}
    </div>
  );
}
