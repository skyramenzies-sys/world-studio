import StockPredictor from './components/StockPredictor';
import React, { useState, useEffect } from 'react';
import { postsAPI, authAPI, usersAPI } from './services/api';
import LoginPage from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import UploadPage from './components/UploadPage';
import HomePage from './components/HomePage';
import ProfilePage from './components/ProfilePage';
import EarningsPage from './components/EarningsPage';
import AnalyticsPage from './components/AnalyticsPage';
import DiscoverPage from './components/DiscoverPage';
import NotificationsPage from './components/NotificationsPage';
import MessagesPage from './components/MessagesPage';
import { safeLocalStorageSet, clearOldPosts } from './storageUtils';

// 💰 PLATFORM FEE CONFIGURATION
const PLATFORM_FEE_PERCENTAGE = 10; // 10% platform fee

function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [currentPage, setCurrentPage] = useState('login');
    const [posts, setPosts] = useState([]);
    const [users, setUsers] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [messages, setMessages] = useState([]); // 💬 Messages state
    const [stories, setStories] = useState([]); // 📱 Stories state

    // 💰 PLATFORM REVENUE TRACKING
    const [platformRevenue, setPlatformRevenue] = useState({
        total: 0,
        fromSales: 0,
        salesCount: 0
    });

    // ... (keep all your existing useEffect hooks - I'm not changing those)

    useEffect(() => {
        const savedUsers = JSON.parse(localStorage.getItem('ws_users') || '[]');
        const savedCurrentUser = JSON.parse(localStorage.getItem('ws_currentUser') || 'null');
        const savedTransactions = JSON.parse(localStorage.getItem('ws_transactions') || '[]');
        const savedPlatformRevenue = JSON.parse(localStorage.getItem('ws_platformRevenue') || '{"total":0,"fromSales":0,"salesCount":0}');
        const savedMessages = JSON.parse(localStorage.getItem('ws_messages') || '[]');
        const savedStories = JSON.parse(localStorage.getItem('ws_stories') || '[]');

        // Load posts from localStorage as fallback
        const savedPosts = JSON.parse(localStorage.getItem('ws_posts') || '[]');
        setPosts(savedPosts);

        setUsers(savedUsers);
        setCurrentUser(savedCurrentUser);
        setTransactions(savedTransactions);
        setPlatformRevenue(savedPlatformRevenue);
        setMessages(savedMessages);
        setStories(savedStories);

        // If user is logged in, fetch posts from API
        if (savedCurrentUser) {
            setCurrentPage('home');
            loadPostsFromAPI();
        }

        if (savedUsers.length === 0) {
            const adminUser = {
                id: 'admin-1',
                username: 'admin',
                email: 'admin@worldstudio.com',
                password: 'admin123',
                role: 'admin',
                avatar: '👑',
                followers: [],
                following: [],
                totalViews: 0,
                totalLikes: 0,
                earnings: 0,
                bio: 'Platform Administrator',
                notifications: []
            };
            const newUsers = [adminUser];
            setUsers(newUsers);
            localStorage.setItem('ws_users', JSON.stringify(newUsers));
        }
    }, []);

    // Function to load posts from API
    const loadPostsFromAPI = async () => {
        try {
            const apiPosts = await postsAPI.getAll();
            setPosts(apiPosts);
            localStorage.setItem('ws_posts', JSON.stringify(apiPosts));
        } catch (error) {
            console.error('Failed to load posts from API:', error);
        }
    };
    useEffect(() => {
        try {
            const success = safeLocalStorageSet('ws_posts', JSON.stringify(posts));
            if (!success) {
                console.warn('⚠️ LocalStorage vol! Auto-cleanup van oude posts...');
                const cleanedPosts = clearOldPosts(posts, 15);
                setPosts(cleanedPosts);

                // Probeer opnieuw
                const retrySuccess = safeLocalStorageSet('ws_posts', JSON.stringify(cleanedPosts));
                if (retrySuccess) {
                    alert('⚠️ LocalStorage was vol!\n\nOude posts zijn automatisch verwijderd om ruimte te maken.\n\nTip: Upload kleinere bestanden of verwijder handmatig oude posts.');
                } else {
                    alert('❌ LocalStorage is vol!\n\nVerwijder handmatig posts via je profiel of gebruik kleinere bestanden.');
                }
            }
        } catch (error) {
            console.error('Error saving posts:', error);
        }
    }, [posts]);

    useEffect(() => { localStorage.setItem('ws_users', JSON.stringify(users)); }, [users]);
    useEffect(() => { localStorage.setItem('ws_currentUser', JSON.stringify(currentUser)); }, [currentUser]);
    useEffect(() => { localStorage.setItem('ws_transactions', JSON.stringify(transactions)); }, [transactions]);
    useEffect(() => { localStorage.setItem('ws_platformRevenue', JSON.stringify(platformRevenue)); }, [platformRevenue]);
    useEffect(() => { localStorage.setItem('ws_messages', JSON.stringify(messages)); }, [messages]);
    useEffect(() => { localStorage.setItem('ws_stories', JSON.stringify(stories)); }, [stories]);

    // ... (keep ALL your existing handler functions - not changing those either)
    // I'll skip pasting them all here to save space, but KEEP THEM ALL!

    const handleLogin = async (email, password) => {
        try {
            const response = await authAPI.login(email, password);

            const loggedInUser = {
                id: response.userId,
                username: response.username,
                email: response.email,
                role: response.role || 'user',
                avatar: response.avatar || '👤',
                token: response.token,
                followers: response.followers || [],
                following: response.following || [],
                totalViews: response.totalViews || 0,
                totalLikes: response.totalLikes || 0,
                earnings: response.earnings || 0,
                bio: response.bio || '',
                notifications: response.notifications || []
            };

            setCurrentUser(loggedInUser);
            localStorage.setItem('ws_currentUser', JSON.stringify(loggedInUser));

            await loadPostsFromAPI();

            setCurrentPage('home');
            return true;
        } catch (error) {
            console.error('❌ Login failed:', error);

            // Fallback to local login for existing users
            const user = users.find(u => u.email === email && u.password === password);
            if (user) {
                setCurrentUser(user);
                localStorage.setItem('ws_currentUser', JSON.stringify(user));
                setCurrentPage('home');
                return true;
            }

            alert(error.message || 'Invalid credentials');
            return false;
        }
    };

    const handleRegister = async (email, username, password) => {
        try {
            // Register via backend API
            const response = await authAPI.register({
                email,
                username,
                password,
                avatar: '👤',
                bio: ''
            });

            // Create user object with token
            const newUser = {
                id: response.userId,
                username: response.username,
                email: response.email,
                role: response.role || 'user',
                avatar: response.avatar || '👤',
                token: response.token,
                followers: [],
                following: [],
                totalViews: 0,
                totalLikes: 0,
                earnings: 0,
                bio: response.bio || '',
                notifications: []
            };

            // Update local state
            const updatedUsers = [...users, newUser];
            setUsers(updatedUsers);
            localStorage.setItem('ws_users', JSON.stringify(updatedUsers));

            // Auto-login after registration
            setCurrentUser(newUser);
            localStorage.setItem('ws_currentUser', JSON.stringify(newUser));

            // Load posts
            await loadPostsFromAPI();

            setCurrentPage('home');
            return true;
        } catch (error) {
            console.error('❌ Registration failed:', error);
            alert(error.message || 'Registration failed. Please try again.');
            return false;
        }
    };

    // ✅ VERBETERDE UPLOAD FUNCTIE - Slaat nu echte fileUrl op!
    const handleUpload = async (uploadData) => {
        // ✅ NULL CHECK
        if (!currentUser) {
            console.error('❌ No user logged in!');
            alert('Please login first!');
            setCurrentPage('login');
            return;
        }

        try {
            // Create post via API
            const newPost = await postsAPI.create({
                title: uploadData.title,
                description: uploadData.description,
                type: uploadData.type,
                category: uploadData.category,
                fileUrl: uploadData.fileUrl,
                fileName: uploadData.fileName,
                fileSize: uploadData.fileSize,
                isFree: uploadData.isFree !== undefined ? uploadData.isFree : true,
                price: uploadData.price || 0,
                isPremium: uploadData.isPremium || false,
                thumbnail: uploadData.type === 'image' ? '🖼️' : uploadData.type === 'video' ? '🎬' : '🎵'
            });

            console.log('✅ Post created via API:', newPost);

            // Update local state
            setPosts([newPost, ...posts]);

            // Also save to localStorage as backup
            const updatedPosts = [newPost, ...posts];
            localStorage.setItem('ws_posts', JSON.stringify(updatedPosts));

            if (!newPost.isFree && newPost.price > 0) {
                console.log(`💰 Created paid content for $${newPost.price}`);
            }

            setCurrentPage('home');
        } catch (error) {
            console.error('❌ Failed to create post:', error);
            alert('Failed to create post. Please try again.');
        }
    };


    const handleLike = (postId) => {
        if (!currentUser) {
            alert('Please login to like posts!');
            return;
        }

        setPosts(posts.map(post => {
            if (post.id === postId) {
                const alreadyLiked = post.likedBy.includes(currentUser.id);

                // Update user stats
                setUsers(users.map(user => {
                    if (user.id === post.userId) {
                        return {
                            ...user,
                            totalLikes: alreadyLiked
                                ? Math.max(0, (user.totalLikes || 0) - 1)
                                : (user.totalLikes || 0) + 1
                        };
                    }
                    return user;
                }));

                return {
                    ...post,
                    likes: alreadyLiked ? post.likes - 1 : post.likes + 1,
                    likedBy: alreadyLiked
                        ? post.likedBy.filter(id => id !== currentUser.id)
                        : [...post.likedBy, currentUser.id]
                };
            }
            return post;
        }));
    };

    const handleComment = (postId, commentText) => {
        if (!commentText.trim()) return;

        if (!currentUser) {
            alert('Please login to comment!');
            return;
        }

        setPosts(posts.map(post => {
            if (post.id === postId) {
                return {
                    ...post,
                    comments: [...post.comments, {
                        id: `comment-${Date.now()}`,
                        userId: currentUser.id,
                        username: currentUser.username,
                        avatar: currentUser.avatar,
                        text: commentText,
                        timestamp: new Date().toISOString()
                    }]
                };
            }
            return post;
        }));
    };

    const incrementViews = (postId) => {
        setPosts(posts.map(post => {
            if (post.id === postId) {
                // Update user stats
                setUsers(users.map(user => {
                    if (user.id === post.userId) {
                        return {
                            ...user,
                            totalViews: (user.totalViews || 0) + 1
                        };
                    }
                    return user;
                }));

                return { ...post, views: post.views + 1 };
            }
            return post;
        }));
    };

    const handleSupport = (creatorId, amount) => {
        if (!currentUser) {
            alert('Please login to support creators!');
            return;
        }

        const transaction = {
            id: `txn-${Date.now()}`,
            fromUserId: currentUser.id,
            fromUsername: currentUser.username,
            toUserId: creatorId,
            amount: amount,
            timestamp: new Date().toISOString(),
            type: 'support'
        };

        setTransactions([...transactions, transaction]);

        setUsers(users.map(user => {
            if (user.id === creatorId) {
                return { ...user, earnings: (user.earnings || 0) + amount };
            }
            return user;
        }));

        alert(`Successfully sent $${amount} to creator! 💰`);
    };

    // 💰 NEW: Purchase Content Function
    const handlePurchase = (postId) => {
        if (!currentUser) {
            alert('Please login to purchase content!');
            return;
        }

        const post = posts.find(p => p.id === postId);
        if (!post) return;

        // Check if already purchased
        if (post.purchasedBy?.includes(currentUser.id)) {
            alert('You already own this content!');
            return;
        }

        // Calculate platform fee (10%)
        const salePrice = post.price;
        const platformFee = (salePrice * PLATFORM_FEE_PERCENTAGE) / 100;
        const creatorEarnings = salePrice - platformFee;

        // Confirm purchase with breakdown
        const confirmPurchase = window.confirm(
            `Purchase "${post.title}" for $${post.price}?\n\n` +
            `💰 Price: $${salePrice.toFixed(2)}\n` +
            `👤 Creator gets: $${creatorEarnings.toFixed(2)} (${100 - PLATFORM_FEE_PERCENTAGE}%)\n` +
            `🏢 Platform fee: $${platformFee.toFixed(2)} (${PLATFORM_FEE_PERCENTAGE}%)\n\n` +
            `You'll get instant access to this content!`
        );

        if (!confirmPurchase) return;

        // Create transaction
        const transaction = {
            id: `txn-${Date.now()}`,
            fromUserId: currentUser.id,
            fromUsername: currentUser.username,
            toUserId: post.userId,
            postId: post.id,
            amount: salePrice,
            creatorEarnings: creatorEarnings,
            platformFee: platformFee,
            timestamp: new Date().toISOString(),
            type: 'purchase'
        };

        setTransactions([...transactions, transaction]);

        // Update post with purchase
        setPosts(posts.map(p => {
            if (p.id === postId) {
                return {
                    ...p,
                    purchasedBy: [...(p.purchasedBy || []), currentUser.id],
                    sales: (p.sales || 0) + 1,
                    revenue: (p.revenue || 0) + creatorEarnings // Creator's cut only
                };
            }
            return p;
        }));

        // Update creator earnings (only their 90%)
        setUsers(users.map(user => {
            if (user.id === post.userId) {
                return {
                    ...user,
                    earnings: (user.earnings || 0) + creatorEarnings
                };
            }
            return user;
        }));

        // 💰 UPDATE PLATFORM REVENUE (your 10%!)
        setPlatformRevenue({
            total: platformRevenue.total + platformFee,
            fromSales: platformRevenue.fromSales + platformFee,
            salesCount: platformRevenue.salesCount + 1
        });

        console.log('💰 SALE BREAKDOWN:');
        console.log(`   Sale Price: $${salePrice.toFixed(2)}`);
        console.log(`   Creator Earnings: $${creatorEarnings.toFixed(2)} (${100 - PLATFORM_FEE_PERCENTAGE}%)`);
        console.log(`   Platform Fee: $${platformFee.toFixed(2)} (${PLATFORM_FEE_PERCENTAGE}%)`);
        console.log(`   Platform Total Revenue: $${(platformRevenue.total + platformFee).toFixed(2)}`);

        alert(
            `🎉 Purchase successful!\n\n` +
            `You now have access to "${post.title}"\n\n` +
            `Creator earned: $${creatorEarnings.toFixed(2)}`
        );
    };

    const handleLogout = () => {
        setCurrentUser(null);
        setCurrentPage('login');
    };

    // 📸 UPDATE AVATAR FUNCTION
    const handleUpdateAvatar = (emoji) => {
        if (!currentUser) return;

        const updatedUser = { ...currentUser, avatar: emoji };
        setCurrentUser(updatedUser);

        // Update in users array
        setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));

        // Update posts van deze user
        setPosts(posts.map(p => p.userId === currentUser.id ? { ...p, avatar: emoji } : p));

        console.log(`✅ Avatar updated to ${emoji}`);
    };

    // 👥 FOLLOW/UNFOLLOW SYSTEM
    const handleFollow = (userIdToFollow) => {
        if (!currentUser || currentUser.id === userIdToFollow) return;

        const updatedUsers = users.map(user => {
            // Update the user being followed (add to their followers)
            if (user.id === userIdToFollow) {
                const updatedFollowers = user.followers || [];
                if (!updatedFollowers.includes(currentUser.id)) {
                    return {
                        ...user,
                        followers: [...updatedFollowers, currentUser.id],
                        notifications: [
                            ...(user.notifications || []),
                            {
                                id: `notif-${Date.now()}`,
                                type: 'follow',
                                from: currentUser.id,
                                fromUsername: currentUser.username,
                                fromAvatar: currentUser.avatar,
                                message: `${currentUser.username} started following you!`,
                                timestamp: new Date().toISOString(),
                                read: false
                            }
                        ]
                    };
                }
            }
            // Update current user (add to their following)
            if (user.id === currentUser.id) {
                const updatedFollowing = user.following || [];
                if (!updatedFollowing.includes(userIdToFollow)) {
                    const updated = {
                        ...user,
                        following: [...updatedFollowing, userIdToFollow]
                    };
                    setCurrentUser(updated); // Update current user state
                    return updated;
                }
            }
            return user;
        });

        setUsers(updatedUsers);
        console.log(`✅ Followed user ${userIdToFollow}`);
    };

    const handleUnfollow = (userIdToUnfollow) => {
        if (!currentUser || currentUser.id === userIdToUnfollow) return;

        const updatedUsers = users.map(user => {
            // Update the user being unfollowed (remove from their followers)
            if (user.id === userIdToUnfollow) {
                const updatedFollowers = (user.followers || []).filter(id => id !== currentUser.id);
                return { ...user, followers: updatedFollowers };
            }
            // Update current user (remove from their following)
            if (user.id === currentUser.id) {
                const updatedFollowing = (user.following || []).filter(id => id !== userIdToUnfollow);
                const updated = { ...user, following: updatedFollowing };
                setCurrentUser(updated); // Update current user state
                return updated;
            }
            return user;
        });

        setUsers(updatedUsers);
        console.log(`✅ Unfollowed user ${userIdToUnfollow}`);
    };

    // 🔔 NOTIFICATION HANDLERS
    const handleClearNotification = (notificationId) => {
        if (!currentUser) return;

        const updatedUser = {
            ...currentUser,
            notifications: (currentUser.notifications || []).filter(n => n.id !== notificationId)
        };

        setCurrentUser(updatedUser);
        setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
    };

    const handleMarkAllAsRead = () => {
        if (!currentUser) return;

        const updatedUser = {
            ...currentUser,
            notifications: (currentUser.notifications || []).map(n => ({ ...n, read: true }))
        };

        setCurrentUser(updatedUser);
        setUsers(users.map(u => u.id === currentUser.id ? updatedUser : u));
    };

    // 💬 MESSAGE HANDLERS
    const handleSendMessage = (messageData) => {
        const newMessage = {
            id: `msg-${Date.now()}`,
            ...messageData,
            timestamp: new Date().toISOString(),
            read: false
        };

        const updatedMessages = [...messages, newMessage];
        setMessages(updatedMessages);
        localStorage.setItem('ws_messages', JSON.stringify(updatedMessages));

        // Create notification for receiver
        const receiver = users.find(u => u.id === messageData.receiverId);
        if (receiver) {
            const updatedReceiver = {
                ...receiver,
                notifications: [
                    ...(receiver.notifications || []),
                    {
                        id: `notif-${Date.now()}`,
                        type: 'message',
                        from: currentUser.id,
                        fromUsername: currentUser.username,
                        fromAvatar: currentUser.avatar,
                        message: `${currentUser.username} sent you a message`,
                        timestamp: new Date().toISOString(),
                        read: false
                    }
                ]
            };
            setUsers(users.map(u => u.id === receiver.id ? updatedReceiver : u));
        }

        console.log(`✅ Message sent from ${currentUser.username}`);
    };

    const handleDeleteMessage = (messageId) => {
        const updatedMessages = messages.filter(m => m.id !== messageId);
        setMessages(updatedMessages);
        localStorage.setItem('ws_messages', JSON.stringify(updatedMessages));
        console.log(`✅ Message deleted: ${messageId}`);
    };

    const handleMarkMessageAsRead = (messageId) => {
        const updatedMessages = messages.map(m =>
            m.id === messageId ? { ...m, read: true } : m
        );
        setMessages(updatedMessages);
        localStorage.setItem('ws_messages', JSON.stringify(updatedMessages));
    };

    // 📱 STORY HANDLERS
    const handleAddStory = (storyData) => {
        const newStory = {
            id: `story-${Date.now()}`,
            userId: currentUser.id,
            ...storyData,
            views: [],
            timestamp: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        };

        const updatedStories = [...stories, newStory];
        setStories(updatedStories);
        localStorage.setItem('ws_stories', JSON.stringify(updatedStories));
        console.log(`✅ Story created by ${currentUser.username}`);
    };

    const handleViewStory = (storyId) => {
        if (!currentUser) return;

        const updatedStories = stories.map(story => {
            if (story.id === storyId && !story.views.includes(currentUser.id)) {
                return {
                    ...story,
                    views: [...story.views, currentUser.id]
                };
            }
            return story;
        });

        setStories(updatedStories);
        localStorage.setItem('ws_stories', JSON.stringify(updatedStories));
    };

    const handleReplyToStory = (recipientId, text) => {
        // Create a DM with the reply
        handleSendMessage({
            senderId: currentUser.id,
            receiverId: recipientId,
            text: `📖 Story reply: ${text}`,
            timestamp: new Date().toISOString(),
            read: false
        });
        console.log(`✅ Story reply sent to user ${recipientId}`);
    };

    // 🗑️ AUTO-DELETE EXPIRED STORIES
    useEffect(() => {
        const cleanupInterval = setInterval(() => {
            const now = new Date();
            const validStories = stories.filter(story => new Date(story.expiresAt) > now);

            if (validStories.length !== stories.length) {
                setStories(validStories);
                localStorage.setItem('ws_stories', JSON.stringify(validStories));
                console.log(`✅ Cleaned up ${stories.length - validStories.length} expired stories`);
            }
        }, 60000); // Check every minute

        return () => clearInterval(cleanupInterval);
    }, [stories]);

    // 💎 SUBSCRIPTION HANDLERS
    const handleSubscribe = (creatorId, tier, price) => {
        if (!currentUser) return;

        // Check if user has enough balance
        if (currentUser.earnings < price) {
            alert(`❌ Insufficient balance! You need $${price} to subscribe.`);
            return;
        }

        // Remove existing subscription to this creator if any
        const existingSubscriptions = (currentUser.subscriptions || []).filter(
            sub => sub.creatorId !== creatorId
        );

        // Add new subscription
        const newSubscription = {
            creatorId: creatorId,
            tier: tier,
            subscribedAt: new Date().toISOString(),
            nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        };

        // Update current user
        const updatedCurrentUser = {
            ...currentUser,
            subscriptions: [...existingSubscriptions, newSubscription],
            earnings: currentUser.earnings - price
        };

        // Update creator - add to their subscribers list
        const creator = users.find(u => u.id === creatorId);
        if (creator) {
            const creatorSubscribers = creator.subscribers || [];
            const existingSubIndex = creatorSubscribers.findIndex(sub => sub.userId === currentUser.id);

            let updatedSubscribers;
            if (existingSubIndex >= 0) {
                // Update existing subscription
                updatedSubscribers = [...creatorSubscribers];
                updatedSubscribers[existingSubIndex] = {
                    userId: currentUser.id,
                    tier: tier,
                    subscribedAt: creatorSubscribers[existingSubIndex].subscribedAt
                };
            } else {
                // Add new subscriber
                updatedSubscribers = [
                    ...creatorSubscribers,
                    {
                        userId: currentUser.id,
                        tier: tier,
                        subscribedAt: new Date().toISOString()
                    }
                ];
            }

            const updatedCreator = {
                ...creator,
                subscribers: updatedSubscribers,
                earnings: (creator.earnings || 0) + price
            };

            // Update users array
            const updatedUsers = users.map(u => {
                if (u.id === currentUser.id) return updatedCurrentUser;
                if (u.id === creatorId) return updatedCreator;
                return u;
            });

            setUsers(updatedUsers);
            setCurrentUser(updatedCurrentUser);

            // Create transaction
            const transaction = {
                id: `trans-${Date.now()}`,
                type: 'subscription',
                amount: price,
                fromUserId: currentUser.id,
                toUserId: creatorId,
                tier: tier,
                timestamp: new Date().toISOString()
            };
            setTransactions([...transactions, transaction]);

            // Create notification for creator
            const updatedCreatorWithNotif = {
                ...updatedCreator,
                notifications: [
                    ...(updatedCreator.notifications || []),
                    {
                        id: `notif-${Date.now()}`,
                        type: 'subscription',
                        from: currentUser.id,
                        fromUsername: currentUser.username,
                        fromAvatar: currentUser.avatar,
                        tier: tier,
                        amount: price,
                        message: `${currentUser.username} subscribed to your ${tier} tier! 💎`,
                        timestamp: new Date().toISOString(),
                        read: false
                    }
                ]
            };

            setUsers(users.map(u => u.id === creatorId ? updatedCreatorWithNotif : u));

            console.log(`✅ ${currentUser.username} subscribed to ${creator.username} (${tier} tier)`);
        }
    };

    const handleUnsubscribe = (creatorId) => {
        if (!currentUser) return;

        const subscription = (currentUser.subscriptions || []).find(
            sub => sub.creatorId === creatorId
        );

        if (!subscription) return;

        // Remove subscription from current user
        const updatedSubscriptions = (currentUser.subscriptions || []).filter(
            sub => sub.creatorId !== creatorId
        );

        const updatedCurrentUser = {
            ...currentUser,
            subscriptions: updatedSubscriptions
        };

        // Remove from creator's subscribers list
        const creator = users.find(u => u.id === creatorId);
        if (creator) {
            const updatedSubscribers = (creator.subscribers || []).filter(
                sub => sub.userId !== currentUser.id
            );

            const updatedCreator = {
                ...creator,
                subscribers: updatedSubscribers
            };

            const updatedUsers = users.map(u => {
                if (u.id === currentUser.id) return updatedCurrentUser;
                if (u.id === creatorId) return updatedCreator;
                return u;
            });

            setUsers(updatedUsers);
            setCurrentUser(updatedCurrentUser);

            console.log(`✅ ${currentUser.username} unsubscribed from ${creator.username}`);
        }
    };

    const deletePost = (postId) => {
        if (window.confirm('Delete this post?')) {
            setPosts(posts.filter(p => p.id !== postId));
        }
    };

    const deleteUser = (userId) => {
        if (window.confirm('Delete this user?')) {
            setUsers(users.filter(u => u.id !== userId));
            setPosts(posts.filter(p => p.userId !== userId));
        }
    };

    // ===== PAGE ROUTING =====

    if (currentPage === 'login') {
        return <LoginPage
            onLogin={handleLogin}
            onRegister={handleRegister}
        />;
    }


    // 📈 NEW: STOCK PREDICTOR PAGE
    if (currentPage === 'stocks') {
        return (
            <div>
                <nav style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    padding: '15px 30px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    color: 'white'
                }}>
                    <h2>📈 Stock Predictor - World-Studio</h2>
                    <button
                        onClick={() => setCurrentPage('home')}
                        style={{
                            padding: '10px 20px',
                            background: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            color: '#667eea'
                        }}
                    >
                        ← Back to Home
                    </button>
                </nav>
                <StockPredictor />
            </div>
        )
    }

    // ... KEEP ALL YOUR OTHER PAGE CONDITIONS

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
                users={users}
                onUpdateAvatar={handleUpdateAvatar}
                onFollow={handleFollow}
                onUnfollow={handleUnfollow}
                onLogout={handleLogout}
                onSubscribe={handleSubscribe}
                onUnsubscribe={handleUnsubscribe}
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
                onPurchase={handlePurchase}
                onFollow={handleFollow}
                onUnfollow={handleUnfollow}
                onLogout={handleLogout}
                incrementViews={incrementViews}
            />
        );
    }

    if (currentPage === 'notifications') {
        return (
            <NotificationsPage
                currentUser={currentUser}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                users={users}
                onLogout={handleLogout}
                onClearNotification={handleClearNotification}
                onMarkAllAsRead={handleMarkAllAsRead}
            />
        );
    }

    if (currentPage === 'messages') {
        return (
            <MessagesPage
                currentUser={currentUser}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                users={users}
                messages={messages}
                onSendMessage={handleSendMessage}
                onDeleteMessage={handleDeleteMessage}
                onMarkAsRead={handleMarkMessageAsRead}
                onLogout={handleLogout}
            />
        );
    }

    return (
        // 🏠 HOMEPAGE - shows all posts from all users
        <HomePage
            currentUser={currentUser}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            posts={posts}
            users={users}
            onLike={handleLike}
            onComment={handleComment}
            incrementViews={incrementViews}
            onView={incrementViews}
            onSupport={handleSupport}
            onPurchase={handlePurchase}
            onFollow={handleFollow}
            onUnfollow={handleUnfollow}
            onLogout={handleLogout}
            messages={messages}
            stories={stories}
            onAddStory={handleAddStory}
            onViewStory={handleViewStory}
            onReplyToStory={handleReplyToStory}
        />
    );
}

export default App;