import React, { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, Trash2 } from 'lucide-react';

function LoginPage({ onLogin }) {
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        age: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // LocalStorage key voor users
    const USERS_KEY = 'world_studio_users';

    // Haal alle users op uit localStorage
    const getUsers = () => {
        const users = localStorage.getItem(USERS_KEY);
        return users ? JSON.parse(users) : [];
    };

    // Sla users op in localStorage
    const saveUsers = (users) => {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    };

    // ✅ NIEUWE FUNCTIE: Clear alle users uit de database
    const clearDatabase = () => {
        if (window.confirm('⚠️ Weet je zeker dat je alle gebruikers wilt verwijderen? Dit kan niet ongedaan worden!')) {
            localStorage.removeItem(USERS_KEY);
            setError('');
            setSuccess('✅ Database cleared! You can now register again.');
            setFormData({
                username: '',
                email: '',
                password: '',
                confirmPassword: '',
                age: ''
            });
            setTimeout(() => setSuccess(''), 3000);
        }
    };

    // ✅ NIEUWE FUNCTIE: Verwijder een specifieke user
    const removeUserByEmail = (email) => {
        const users = getUsers();
        const filteredUsers = users.filter(user => user.email !== email);
        saveUsers(filteredUsers);
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (isLogin) {
            // ✅ LOGIN using App.jsx callback
            const result = onLogin({ type: 'login', email: formData.email, password: formData.password });

            if (result) {
                setSuccess('✅ Login successful!');
            } else {
                setError('❌ Invalid email or password');
            }
        } else {
            // ✅ REGISTER with validation
            if (!formData.username || !formData.email || !formData.password || !formData.age) {
                setError('❌ Please fill in all fields');
                return;
            }

            // ✅ 18+ AGE CHECK
            const age = parseInt(formData.age);
            if (isNaN(age) || age < 18) {
                setError('❌ You must be 18 years or older to register');
                return;
            }

            if (formData.password !== formData.confirmPassword) {
                setError('❌ Passwords do not match');
                return;
            }

            if (formData.password.length < 6) {
                setError('❌ Password must be at least 6 characters');
                return;
            }

            // ✅ REGISTER using App.jsx callback
            const result = onLogin({
                type: 'register',
                username: formData.username,
                email: formData.email,
                password: formData.password,
                age: age
            });

            if (result.success) {
                setSuccess('✅ Account created! You are now logged in!');
                // User is automatically logged in by App.jsx
            } else {
                setError(`❌ ${result.error}`);
            }
        }
    };

    // Toon huidige users (voor debug)
    const currentUsers = getUsers();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItaDJWMzZoLTJ6bTAgNGgydjJoLTJ2LTJ6bS0yLTJ2Mmgydi0yaC0yem0yLTJoMnYyaC0ydi0yem0tMiAwdjJoMnYtMmgtMnptMC0yaDJ2MmgtMnYtMnptMi0ydjJoMnYtMmgtMnptLTQgMHYyaDJ2LTJoLTJ6bTQtMmgydjJoLTJ2LTJ6bS00IDBoMnYyaC0ydi0yem0wLTJoMnYyaC0ydi0yem0yLTJ2Mmgydi0yaC0yem0tMiAwdjJoMnYtMmgtMnptLTItMmgydjJoLTJ2LTJ6bTQgMHYyaDJ2LTJoLTJ6bTAtMmgydjJoLTJ2LTJ6bS0yIDBoMnYyaC0ydi0yem0wLTJoMnYyaC0ydi0yem0yLTJ2Mmgydi0yaC0yem0tMiAwdjJoMnYtMmgtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40"></div>

            <div className="relative w-full max-w-md">
                {/* Main Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-cyan-500 to-purple-500 p-8 text-center">
                        <h1 className="text-4xl font-bold text-white mb-2">World-Studio</h1>
                        <p className="text-white/80">
                            {isLogin ? 'Welkom terug! 👋' : 'Maak je account aan 🚀'}
                        </p>
                    </div>

                    {/* Form */}
                    <div className="p-8">
                        {error && (
                            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-xl text-green-300 text-sm">
                                {success}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {!isLogin && (
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Username
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                                        <input
                                            type="text"
                                            name="username"
                                            value={formData.username}
                                            onChange={handleInputChange}
                                            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent transition-all"
                                            placeholder="Jouw username"
                                            required={!isLogin}
                                        />
                                    </div>
                                </div>
                            )}

                            {!isLogin && (
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Age (18+ Required) 🔞
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            name="age"
                                            value={formData.age}
                                            onChange={handleInputChange}
                                            min="18"
                                            max="120"
                                            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent transition-all"
                                            placeholder="Your age"
                                            required={!isLogin}
                                        />
                                    </div>
                                    <p className="text-xs text-white/60 mt-1">
                                        You must be 18 years or older to use World-Studio
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent transition-all"
                                        placeholder="jouw@email.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Wachtwoord
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className="w-full pl-12 pr-12 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent transition-all"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            {!isLogin && (
                                <div>
                                    <label className="block text-sm font-medium text-white/80 mb-2">
                                        Bevestig Wachtwoord
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent transition-all"
                                            placeholder="••••••••"
                                            required={!isLogin}
                                        />
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {isLogin ? 'Inloggen 🚀' : 'Account Aanmaken 🎉'}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <button
                                onClick={() => {
                                    setIsLogin(!isLogin);
                                    setError('');
                                    setSuccess('');
                                    setFormData({
                                        username: '',
                                        email: '',
                                        password: '',
                                        confirmPassword: ''
                                    });
                                }}
                                className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors"
                            >
                                {isLogin
                                    ? "Nog geen account? Registreer hier"
                                    : "Heb je al een account? Login hier"}
                            </button>
                        </div>

                        {/* ✅ NIEUWE SECTIE: Database Management */}
                        <div className="mt-8 pt-6 border-t border-white/10">
                            <p className="text-white/60 text-xs text-center mb-3">
                                Geregistreerde users: {currentUsers.length}
                            </p>
                            <button
                                type="button"
                                onClick={clearDatabase}
                                className="w-full py-2 bg-red-500/20 border border-red-500/50 text-red-300 rounded-xl text-sm font-medium hover:bg-red-500/30 transition-all flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Clear Database (Reset Alles)
                            </button>
                        </div>

                        {/* Debug info */}
                        {currentUsers.length > 0 && (
                            <div className="mt-4 p-3 bg-white/5 rounded-xl">
                                <p className="text-white/60 text-xs mb-2">Geregistreerde emails:</p>
                                {currentUsers.map((user, index) => (
                                    <div key={index} className="flex items-center justify-between text-xs text-white/40 mb-1">
                                        <span>{user.email}</span>
                                        <button
                                            onClick={() => {
                                                removeUserByEmail(user.email);
                                                setSuccess(`✅ ${user.email} verwijderd`);
                                                setTimeout(() => setSuccess(''), 2000);
                                            }}
                                            className="text-red-400 hover:text-red-300 text-xs"
                                        >
                                            Verwijder
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-white/40 text-sm mt-6">
                    © 2024 World-Studio. Share Your World 🌍
                </p>
            </div>
        </div>
    );
}

export default LoginPage;