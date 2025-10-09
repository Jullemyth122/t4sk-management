import '../../scss/skeleton.scss'

const SkeletonBlock = ({ className = "", style = {}, rounded = true }) => {
    return (
        <div
            className={`skeleton-block ${rounded ? "rounded" : ""} ${className}`}
            style={style}
            aria-hidden="true"
        />
    );
};

export default SkeletonBlock;
