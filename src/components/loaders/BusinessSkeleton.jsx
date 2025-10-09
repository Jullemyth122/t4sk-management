// BusinessSkeleton.jsx
import SkeletonBlock from "./SkeletonBlock";
import "../../scss/skeleton.scss";

export default function BusinessSkeleton() {
  return (
    <main className="business-create-page skeleton-business">
      <header className="bc-header">
        <div>
          <SkeletonBlock style={{ width: 280, height: 34, marginBottom: 8 }} />
          <SkeletonBlock style={{ width: 420, height: 14 }} />
        </div>

        <nav className="bc-tabs" role="tablist" aria-hidden="true">
          <SkeletonBlock style={{ width: 90, height: 36, borderRadius: 10, marginRight: 8 }} />
          <SkeletonBlock style={{ width: 90, height: 36, borderRadius: 10, marginRight: 8 }} />
          <SkeletonBlock style={{ width: 90, height: 36, borderRadius: 10, marginRight: 8 }} />
          <SkeletonBlock style={{ width: 90, height: 36, borderRadius: 10 }} />
        </nav>
      </header>

      <div className="bc-body">
        <section className="bc-form">
          {/* Profile card skeleton */}
          <div className="card">
            <SkeletonBlock style={{ width: "50%", height: 22, marginBottom: 12 }} /> {/* card-title */}
            {/* Simulate a few label + input rows */}
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ marginTop: 12 }}>
                <SkeletonBlock style={{ width: 120, height: 12, marginBottom: 8 }} /> {/* label */}
                <SkeletonBlock style={{ width: "100%", height: 40, borderRadius: 8 }} />
              </div>
            ))}

            <hr style={{ margin: "12px 0", opacity: 0 }} />

            <SkeletonBlock style={{ width: "35%", height: 18, marginTop: 12 }} /> {/* subtitle */}
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <SkeletonBlock style={{ width: 120, height: 40, borderRadius: 8 }} />
              <SkeletonBlock style={{ width: 120, height: 40, borderRadius: 8 }} />
            </div>
          </div>

          {/* Members / Roles cards skeleton */}
          <div className="card">
            <SkeletonBlock style={{ width: "45%", height: 20, marginBottom: 12 }} />
            <SkeletonBlock style={{ width: "100%", height: 40, borderRadius: 8 }} />
            <div style={{ height: 12 }} />
            <SkeletonBlock style={{ width: "70%", height: 14, marginBottom: 8 }} />
            <SkeletonBlock style={{ width: "100%", height: 160, borderRadius: 8 }} />
          </div>

          <div className="card">
            <SkeletonBlock style={{ width: "45%", height: 20, marginBottom: 12 }} />
            <SkeletonBlock style={{ width: "100%", height: 40, borderRadius: 8 }} />
            <div style={{ height: 8 }} />
            <SkeletonBlock style={{ width: "100%", height: 120, borderRadius: 8 }} />
          </div>
        </section>

        <aside className="bc-preview">
          <div className="preview-card">
            <div className="preview-header">
              <div className="logo">
                <SkeletonBlock style={{ width: 72, height: 72, borderRadius: 12 }} />
              </div>
              <div className="title">
                <SkeletonBlock style={{ width: 160, height: 18, marginBottom: 8 }} />
                <SkeletonBlock style={{ width: 120, height: 12 }} />
              </div>
            </div>

            <div className="preview-body">
              <SkeletonBlock style={{ width: "60%", height: 12, marginBottom: 8 }} />
              <SkeletonBlock style={{ width: "100%", height: 12, marginBottom: 6 }} />
              <SkeletonBlock style={{ width: "100%", height: 12, marginBottom: 6 }} />
              <div style={{ marginTop: 12 }}>
                <SkeletonBlock style={{ width: "80%", height: 12, marginBottom: 8 }} />
                <SkeletonBlock style={{ width: "100%", height: 12, marginBottom: 8 }} />
                <SkeletonBlock style={{ width: "70%", height: 12 }} />
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <SkeletonBlock style={{ width: 80, height: 36, borderRadius: 8 }} />
                <SkeletonBlock style={{ width: 80, height: 36, borderRadius: 8 }} />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
