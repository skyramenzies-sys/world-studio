import React, { useEffect, useState } from "react";
import axios from "axios";

export default function ProfilePage({ currentUser }) {
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        (async () => {
            const res = await axios.get(
                `https://world-studio-production.up.railway.app/api/users/${currentUser.id}`
            );
            setProfile(res.data);
        })();
    }, [currentUser.id]);

    if (!profile) return <p className="text-center mt-20">Loading Profile ...</p>;

    return (
        <div className="p-8 text-white min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-black">
            <div className="flex items-center gap-4 mb-6">
                <img
                    src={profile.avatar || "/default-avatar.png"}
                    alt=""
                    className="w-24 h-24 rounded-full object-cover border-2 border-white/20"
                />
                <div>
                    <h1 className="text-2xl font-bold">{profile.username}</h1>
                    <p className="text-white/60">{profile.bio}</p>
                </div>
            </div>

            <div className="flex gap-6">
                <Stat label="Followers" value={profile.followers.length} />
                <Stat label="Following" value={profile.following.length} />
            </div>
        </div>
    );
}

function Stat({ label, value }) {
    return (
        <div className="bg-white/10 p-4 rounded-lg text-center border border-white/10">
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-white/60 text-sm">{label}</div>
        </div>
    );
}
