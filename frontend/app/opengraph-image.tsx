import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Link preview card.
 *
 * The site used to point og:image straight at the logo PNG, which broke in
 * three ways at once: the file has an alpha channel and messaging apps
 * composite transparency onto black, where a dark navy wordmark disappears;
 * its 4.47:1 strip got letterboxed or centre-cropped inside the 1.91:1 box
 * that summary_large_image reserves; and at 1136px wide it fell under the
 * minimum several platforms require.
 *
 * This renders an opaque 1200x630 card instead, so there is nothing to
 * composite and nothing to crop.
 */
export const alt =
  "CourseBridge: know exactly what classes you need before you transfer.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Read at build time rather than inlining ~157KB of base64 into this file.
const logo = readFileSync(
  join(process.cwd(), "public", "coursebridge-logo.png"),
).toString("base64");

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          // Opaque, and the same warm off-white the site uses.
          backgroundColor: "#faf9f6",
          padding: "72px 80px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`data:image/png;base64,${logo}`}
          alt=""
          width={340}
          height={76}
        />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "#1a2e22",
              maxWidth: 900,
            }}
          >
            Know exactly what classes you need before you transfer.
          </div>
          <div style={{ fontSize: 30, color: "#5a616b", marginTop: 24 }}>
            UC transfer plans built on real ASSIST articulation data.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ width: 56, height: 6, backgroundColor: "#0b7f46" }} />
          <div style={{ fontSize: 28, color: "#5a616b", marginLeft: 20 }}>
            coursebridge.us
          </div>
        </div>
      </div>
    ),
    size,
  );
}
