export default function SkeletonCards({ count = 5 }) {
    return Array.from({ length: count }).map((_, i) => (
        <div key={`skel-${i}`} className="skeleton-card">
            <div className="skeleton-poster"></div>
            <div className="skeleton-text"></div>
            <div className="skeleton-text-sm"></div>
        </div>
    ));
}
