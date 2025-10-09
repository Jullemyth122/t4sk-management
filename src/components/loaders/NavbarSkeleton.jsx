import React from "react";
import SkeletonBlock from "./SkeletonBlock"; // same helper used in HomeSkeleton
import "../../scss/skeleton.scss";

// Lightweight skeleton placeholder for your Navigation component
// Matches structure of Navigation.jsx: logo, links, account name, notification icon, mobile menu
export default function NavbarSkeleton() {
  return (
    <div className="navigator-comp skeleton-navbar w-full">
      <ul className="gap-3 h-full flex items-center justify-between px-4">
        {/* left: logo */}
        <div className="nav-side flex items-center gap-3">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <SkeletonBlock style={{ width: 140, height: 40, borderRadius: 8 }} />
            {/* overlapping/absolute small logo */}
            <SkeletonBlock style={{ width: 110, height: 20, borderRadius: 6, marginTop: -28 }} />
          </div>
        </div>

        {/* center/right group: links + account */}
        <div className="grp-1 flex items-center gap-4">
          {/* nav links */}
          <div className="nav-side-links flex items-center justify-evenly gap-5 px-2 m-0">
            {["Home", "Dashboard", "Settings", "Signup"].map((_, i) => (
              <div key={i} className="nav-link flex items-center gap-3">
                <SkeletonBlock style={{ width: 20, height: 20, borderRadius: 6 }} />
                <SkeletonBlock style={{ width: 56, height: 18, borderRadius: 6 }} />
              </div>
            ))}
          </div>

          {/* account name placeholder (only shown when logged in in real navbar) */}
          <div className="acc_name hidden md:block">
            <SkeletonBlock style={{ width: 160, height: 18, borderRadius: 8 }} />
          </div>

          {/* notification icon placeholder */}
          <div className="nav-link notification-button">
            <SkeletonBlock style={{ width: 20, height: 20, borderRadius: "50%" }} />
          </div>

          {/* logout / signup button placeholder (compact) */}
          <div className="hidden md:block">
            <SkeletonBlock style={{ width: 80, height: 30, borderRadius: 8 }} />
          </div>

          {/* mobile menu button */}
          <div className="mobile-menu-button md:hidden p-2 flex flex-col gap-1">
            <SkeletonBlock style={{ width: 24, height: 4, borderRadius: 4 }} />
            <SkeletonBlock style={{ width: 24, height: 4, borderRadius: 4 }} />
            <SkeletonBlock style={{ width: 24, height: 4, borderRadius: 4 }} />
          </div>
        </div>
      </ul>
    </div>
  );
}
