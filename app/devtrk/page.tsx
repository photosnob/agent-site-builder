"use client";
import { TrackingSettings } from "@/components/seo/TrackingSettings";
export default function P() { return <div style={{ maxWidth: 640, padding: 20 }}><TrackingSettings siteId="s1" initial={{ ga4: "G-OLD1234" }} /></div>; }
