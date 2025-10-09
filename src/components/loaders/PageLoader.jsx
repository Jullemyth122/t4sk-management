import "../../scss/skeleton.scss";

export default function PageLoader({ message = "Loading…", compact = false }) {
    return (
        <div className={`page-loader ${compact ? "compact" : ""}`} role="status" aria-live="polite">
            <div className="spinner" />
            <div className="loader-text">{message}</div>
        </div>
    );
}
