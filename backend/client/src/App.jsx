import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import UploadPage from './components/UploadPage';
import HomePage from './components/HomePage';
import ProfilePage from './components/ProfilePage';
import EarningsPage from './components/EarningsPage';
import AnalyticsPage from './components/AnalyticsPage';
import DiscoverPage from './components/DiscoverPage';
import GalleryPage from './components/GalleryPage';
import apiService from './services/api';

function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [currentPage, setCurrentPage] = useState('login');
    const [posts, setPosts] = useState([]);
    const [users, setUsers] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in
        const savedUser = localStorage.getItem('ws_user');
        const token = localStorage.getItem('ws_token');

        if (savedUser && token) {
            setCurrentUser(JSON.parse(savedUser));
            setCurrentPage('home');
            loadData();
        } else {
            setLoading(false);
        }
    }, []);

    const loadData = async () => {
        try {
            const [postsData, usersData] = await Promise.all([
                apiService.getPosts(),
                apiService.getUsers()
            ]);
            setPosts(postsData);
            setUsers(usersData);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (email, password) => {
        try {
            const result = await apiService.login({ email, password });
            setCurrentUser(result.user);
            setCurrentPage(result.user.role === 'admin' ? 'admin' : 'home');
            loadData();
            return true;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    };

    const handleRegister = async (registerData) => {
        try {
            const result = await apiService.register(registerData);
            setCurrentUser(result.user);
            setCurrentPage('home');
            loadData();
            return true;
        } catch (error) {
            console.error('Register error:', error);
            return false;
        }
    };

    const handleUpload = (newPost) => {
        // Add new post to state
        setPosts([newPost, ...posts]);
    };

    const handleLike = async (postId) => {
        try {
            const result = await apiService.likePost(postId);
            setPosts(posts.map(post =>
                post.id === postId
                    ? { ...post, likes: result.likes, likedBy: result.likedBy }
                    : post
            ));
        } catch (error) {
            console.error('Error liking post:', error);
        }
    };

    const handleComment = async (postId, commentText) => {
        try {
            const result = await apiService.commentOnPost(postId, commentText);
            setPosts(posts.map(post =>
                post.id === postId
                    ? { ...post, comments: result.comments }
                    : post
            ));
        } catch (error) {
            console.error('Error commenting:', error);
        }
    };

    const incrementViews = async (postId) => {
        try {
            const result = await apiService.incrementView(postId);
            setPosts(posts.map(post =>
                post.id === postId
                    ? { ...post, views: result.views }
                    : post
            ));
        } catch (error) {
            console.error('Error incrementing views:', error);
        }
    };

    const handleSupport = async (creatorId, amount) => {
        try {
            await apiService.supportCreator(creatorId, amount);

            // Update users earnings
            setUsers(users.map(user =>
                user.id === creatorId
                    ? { ...user, earnings: (user.earnings || 0) + amount }
                    : user
            ));

            alert(`Successfully sent ${amount} to creator! 💰`);
        } catch (error) {
            console.error('Error supporting creator:', error);
            alert('Error processing payment. Please try again.');
        }
    };

    const handleLogout = () => {
        apiService.logout();
        setCurrentUser(null);
        setCurrentPage('login');
        setPosts([]);
        setUsers([]);
    };

    const deletePost = async (postId) => {
        try {
            await apiService.deletePost(postId);
            setPosts(posts.filter(p => p.id !== postId));
        } catch (error) {
            console.error('Error deleting post:', error);
        }
    };

    const deleteUser = async (userId) => {
        if (window.confirm('Delete this user?')) {
            try {
                // Note: You need to add this endpoint to your backend
                setUsers(users.filter(u => u.id !== userId));
                setPosts(posts.filter(p => p.userId !== userId));
            } catch (error) {
                console.error('Error deleting user:', error);
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-cyan-400 border-t-transparent"></div>
                    <p className="mt-4 text-white text-xl">Loading World-Studio...</p>
                </div>
            </div>
        );
    }

    if (currentPage === 'login') {
        return <LoginPage onLogin={handleLogin} onRegister={handleRegister} />;
    }

    if (currentPage === 'admin') {
        return (
            <AdminDashboard
                users={users}
                posts={posts}
                transactions={transactions}
                onLogout={handleLogout}
                onDeleteUser={deleteUser}
                onDeletePost={deletePost}
            />
        );
    }

    if (currentPage === 'upload') {
        return (
            <UploadPage
                currentUser={currentUser}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                onUpload={handleUpload}
                onLogout={handleLogout}
            />
        );
    }

    if (currentPage === 'profile') {
        return (
            <ProfilePage
                currentUser={currentUser}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                posts={posts.filter(p => p.userId === currentUser.id)}
                onLogout={handleLogout}
            />
        );
    }

    if (currentPage === 'earnings') {
        return (
            <EarningsPage
                currentUser={currentUser}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                transactions={transactions.filter(t => t.toUserId === currentUser.id)}
                users={users}
                onLogout={handleLogout}
            />
        );
    }

    if (currentPage === 'analytics') {
        return (
            <AnalyticsPage
                currentUser={currentUser}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                posts={posts.filter(p => p.userId === currentUser.id)}
                onLogout={handleLogout}
            />
        );
    }

    if (currentPage === 'discover') {
        return (
            <DiscoverPage
                currentUser={currentUser}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                posts={posts}
                users={users}
                onLike={handleLike}
                onComment={handleComment}
                onView={incrementViews}
                onSupport={handleSupport}
                onLogout={handleLogout}
            />
        );
    }

    if (currentPage === 'gallery') {
        return (
            <GalleryPage
                currentUser={currentUser}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                onLogout={handleLogout}
            />
        );
    }

    return (
        <HomePage
            currentUser={currentUser}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            posts={posts}
            onLike={handleLike}
            onComment={handleComment}
            onView={incrementViews}
            onSupport={handleSupport}
            onLogout={handleLogout}
        />
    );
}

export default App;