import React from "react";
import PostCard from "./PostCard";

export default function HomePage({ posts, currentUser }) {
    return (
        <div className="p-6 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((p) => (
                <PostCard key={p._id} post={p} currentUser={currentUser} />
            ))}
        </div>
    );
}
