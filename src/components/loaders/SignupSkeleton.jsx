// src/components/loaders/SignupSkeleton.jsx
import React from "react";
import SkeletonBlock from "./SkeletonBlock";
import "../../scss/skeleton.scss";
import "../../scss/signup.scss"; // ensure signup styles applied (so skeleton matches layout)

/**
 * SignupSkeleton
 * - Keep DOM structure & classes identical to Signup.jsx so CSS matches
 * - Pre-position panels with translateX(0/100/200%) so they don't stack
 */
export default function SignupSkeleton() {
  // We'll render the same structure and pre-translate the panels so when the real markup
  // is mounted GSAP won't find panels stacked and layout won't jump.
  return (
    <div className="signup-comp skeleton-signup flex items-center justify-center relative">
      <div className="signup-in-comp flex items-center justify-center relative">
        <div className="sign-out-comp skeleton-inner flex items-center justify-evenly">
          {/* Left: hero area — use the same class so CSS widths match the real UI */}
          <div className="int_comp skeleton-hero relative">
            <SkeletonBlock style={{ width: "65%", height: 100, marginBottom: 12 }} />
            <SkeletonBlock style={{ width: "55%", height: 100, marginBottom: 12 }} />
            <SkeletonBlock style={{ width: "70%", height: 100, marginBottom: 18 }} />

            <SkeletonBlock style={{ width: "80%", height: 16, marginTop: 8 }} />
            <div style={{ height: 8 }} />
            <SkeletonBlock style={{ width: "60%", height: 12, marginTop: 6 }} />
            <SkeletonBlock style={{ width: "45%", height: 12, marginTop: 6 }} />

            <div style={{ position: "absolute", left: 0, bottom: 8 }}>
              <SkeletonBlock style={{ width: 160, height: 12 }} />
            </div>
          </div>

          <div className="line" /> {/* same class so signup.scss styling applies */}

          {/* Right: form area — use same classes so signup.scss rules apply */}
          <div className="si_comp skeleton-form">
            <div className="form-sign-up">
              <div className="form-header">
                <SkeletonBlock style={{ width: 120, height: 30, borderRadius: 8 }} />
                <SkeletonBlock style={{ width: 100, height: 30, borderRadius: 8 }} />
                <SkeletonBlock style={{ width: 140, height: 30, borderRadius: 8 }} />
              </div>

              {/* slider: DO NOT fix to px; let CSS (.slider { height: 100% }) do its job */}
              <div className="slider" aria-hidden="true">
                {/* three form panels pre-translated so they don't overlap */}
                <div
                  className="label-inputs"
                  style={{ transform: "translateX(0%)", position: "absolute", inset: 0 }}
                >
                  <div className="label-input">
                    <SkeletonBlock style={{ width: "40%", height: 14 }} />
                    <SkeletonBlock style={{ width: "100%", height: 50, borderRadius: 8 }} />
                    <SkeletonBlock style={{ width: "100%", height: 50, borderRadius: 8 }} />
                    <SkeletonBlock style={{ width: "100%", height: 50, borderRadius: 8 }} />

                    <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                      <SkeletonBlock style={{ width: 130, height: 60, borderRadius: 8 }} />
                      <SkeletonBlock style={{ width: 130, height: 60, borderRadius: 8 }} />
                    </div>

                    <div style={{ marginTop: 8 }}>
                      <SkeletonBlock style={{ width: "60%", height: 12 }} />
                    </div>
                  </div>
                </div>

                <div
                  className="label-inputs"
                  style={{ transform: "translateX(100%)", position: "absolute", inset: 0 }}
                >
                  <div className="label-input">
                    <SkeletonBlock style={{ width: "40%", height: 14 }} />
                    <SkeletonBlock style={{ width: "100%", height: 36, borderRadius: 8 }} />
                    <SkeletonBlock style={{ width: "100%", height: 36, borderRadius: 8 }} />

                    <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                      <SkeletonBlock style={{ width: 130, height: 40, borderRadius: 8 }} />
                      <SkeletonBlock style={{ width: 130, height: 40, borderRadius: 8 }} />
                    </div>

                    <div style={{ marginTop: 8 }}>
                      <SkeletonBlock style={{ width: "60%", height: 12 }} />
                    </div>
                  </div>
                </div>

                <div
                  className="label-inputs"
                  style={{ transform: "translateX(200%)", position: "absolute", inset: 0 }}
                >
                  <div className="label-input">
                    <SkeletonBlock style={{ width: "40%", height: 14 }} />
                    <SkeletonBlock style={{ width: "100%", height: 36, borderRadius: 8 }} />

                    <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                      <SkeletonBlock style={{ width: 130, height: 40, borderRadius: 8 }} />
                      <SkeletonBlock style={{ width: 130, height: 40, borderRadius: 8 }} />
                    </div>

                    <div style={{ marginTop: 8 }}>
                      <SkeletonBlock style={{ width: "60%", height: 12 }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="copyright" aria-hidden="true">
                <SkeletonBlock style={{ width: 200, height: 12 }} />
              </div>
            </div>
          </div>
        </div>

        {/* shapes (keep but low-impact) */}
        <div className="circle" style={{ display: "none" }} />
        <div className="box" style={{ display: "none" }} />
        <div className="box_dev" style={{ display: "none" }} />
      </div>
    </div>
  );
}
