// backend/routes/auth.js
// World-Studio.live - Authentication Routes
// Handles registration, login, password reset, bonuses, and referrals

const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

// ===========================================
// EMAIL SERVICE (Optional)
// ===========================================
let sgMail = null;
try {
    sgMail = require("@sendgrid/mail");
    if (process.env.SENDGRID_API_KEY) {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        console.log("✅ SendGrid configured");
    }
} catch (e) {
    console.log("📧 SendGrid not configured - email features disabled");
}

// ===========================================
// BONUS CONFIGURATION
// ===========================================
const BONUSES = {
    WELCOME: {
        amount: 100,
        description: "🎉 Welcome bonus!",
        oneTime: true
    },
    DAILY_LOGIN: {
        amount: 10,
        description: "📅 Daily login bonus!",
        oneTime: false
    },
    REFERRAL: {
        amount: 50,
        description: "🔗 Referral bonus!",
        oneTime: false // Can earn multiple times
    },
    REFERRED_USER: {
        amount: 25,
        description: "🎁 Referred signup bonus!",
        oneTime: true
    },
    PROFILE_COMPLETE: {
        amount: 25,
        description: "✨ Profile completed bonus!",
        oneTime: true
    },
    EMAIL_VERIFIED: {
        amount: 20,
        description: "📧 Email verified bonus!",
        oneTime: true
    },
    FIRST_STREAM: {
        amount: 50,
        description: "🎬 First stream bonus!",
        oneTime: true
    },
    FIRST_POST: {
        amount: 15,
        description: "📝 First post bonus!",
        oneTime: true
    }
};

// Export for use in other routes
router.BONUSES = BONUSES;

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Add bonus to user wallet
 */
const addBonus = async (userId, bonusType, customAmount = null) => {
    try {
        const bonus = BONUSES[bonusType];
        if (!bonus && !customAmount) return null;

        const user = await User.findById(userId);
        if (!user) return null;

        // Initialize wallet if needed
        if (!user.wallet) {
            user.wallet = {
                balance: 0,
                totalReceived: 0,
                totalSpent: 0,
                transactions: [],
            };
        }

        // Check if one-time bonus already claimed
        if (bonus?.oneTime && bonusType !== "DAILY_LOGIN") {
            const alreadyClaimed = user.wallet.transactions?.some(
                (t) => t.type === "bonus" && t.meta?.bonusType === bonusType
            );
            if (alreadyClaimed) return null;
        }

        const amount = customAmount || bonus.amount;
        const description = bonus?.description || `Bonus: ${bonusType}`;

        user.wallet.balance += amount;
        user.wallet.totalReceived += amount;
        user.wallet.transactions.unshift({
            type: "bonus",
            amount,
            description,
            status: "completed",
            meta: { bonusType },
            createdAt: new Date(),
        });

        // Keep only last 500 transactions
        if (user.wallet.transactions.length > 500) {
            user.wallet.transactions = user.wallet.transactions.slice(0, 500);
        }

        await user.save();

        console.log(`🎁 Bonus: ${amount} coins (${bonusType}) added to ${user.username}`);

        return {
            bonus: amount,
            newBalance: user.wallet.balance,
            bonusType,
            description
        };
    } catch (e) {
        console.error("Add bonus error:", e);
        return null;
    }
};

router.addBonus = addBonus;

/**
 * Calculate age from birth date
 */
const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age;
};

/**
 * Generate JWT token
 */
const generateToken = (userId, expiresIn = "30d") => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn }
    );
};

/**
 * Generate referral code
 */
const generateReferralCode = (username) => {
    const prefix = username.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4);
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${suffix}`;
};

/**
 * Send email (if SendGrid configured)
 */
const sendEmail = async (to, subject, html) => {
    if (!sgMail || !process.env.SENDGRID_API_KEY) {
        console.log(`📧 Email skipped (SendGrid not configured): ${subject} to ${to}`);
        return false;
    }

    try {
        await sgMail.send({
            to,
            from: process.env.EMAIL_FROM || "noreply@world-studio.live",
            subject,
            html
        });
        console.log(`📧 Email sent: ${subject} to ${to}`);
        return true;
    } catch (err) {
        console.error("Email error:", err);
        return false;
    }
};

// ===========================================
// REGISTER
// ===========================================

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post("/register", async (req, res) => {
    try {
        const {
            email,
            username,
            password,
            avatar,
            bio,
            birthDate,
            referralCode,
            displayName
        } = req.body;

        // Validation
        if (!email || !username || !password) {
            return res.status(400).json({
                success: false,
                error: "Email, username and password are required"
            });
        }

        if (!birthDate) {
            return res.status(400).json({
                success: false,
                error: "Birth date is required"
            });
        }

        if (calculateAge(birthDate) < 18) {
            return res.status(400).json({
                success: false,
                error: "You must be 18 or older to register"
            });
        }

        // Username validation
        if (username.length < 3 || username.length > 30) {
            return res.status(400).json({
                success: false,
                error: "Username must be 3-30 characters"
            });
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return res.status(400).json({
                success: false,
                error: "Username can only contain letters, numbers, and underscores"
            });
        }

        // Check for reserved usernames
        const reservedUsernames = ["admin", "administrator", "moderator", "support", "help", "system", "worldstudio"];
        if (reservedUsernames.includes(username.toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: "This username is not available"
            });
        }

        // Check email exists
        if (await User.findOne({ email: email.toLowerCase() })) {
            return res.status(400).json({
                success: false,
                error: "Email already registered"
            });
        }

        // Check username exists (case insensitive)
        if (await User.findOne({ username: { $regex: new RegExp(`^${username}$`, "i") } })) {
            return res.status(400).json({
                success: false,
                error: "Username already taken"
            });
        }

        // Password validation
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: "Password must be at least 6 characters"
            });
        }

        // Calculate initial bonuses
        let initialBonus = BONUSES.WELCOME.amount;
        const transactions = [
            {
                type: "bonus",
                amount: BONUSES.WELCOME.amount,
                description: BONUSES.WELCOME.description,
                status: "completed",
                meta: { bonusType: "WELCOME" },
                createdAt: new Date(),
            },
        ];

        // Check referral code
        let referrer = null;
        if (referralCode) {
            referrer = await User.findOne({
                referralCode: referralCode.toUpperCase()
            });

            if (referrer) {
                initialBonus += BONUSES.REFERRED_USER.amount;
                transactions.push({
                    type: "bonus",
                    amount: BONUSES.REFERRED_USER.amount,
                    description: BONUSES.REFERRED_USER.description,
                    status: "completed",
                    meta: {
                        bonusType: "REFERRED_USER",
                        referredBy: referrer._id
                    },
                    createdAt: new Date(),
                });
            }
        }

        // Create user
        const user = new User({
            email: email.toLowerCase(),
            username,
            displayName: displayName || username,
            password,
            avatar: avatar || "",
            bio: bio || "",
            birthDate: new Date(birthDate),
            referralCode: generateReferralCode(username),
            referredBy: referrer?._id || null,
            lastLoginDate: new Date(),
            lastSeen: new Date(),
            emailVerified: false,
            role: "creator", // All new users are creators by default
            wallet: {
                balance: initialBonus,
                totalReceived: initialBonus,
                totalSpent: 0,
                transactions,
            },
            settings: {
                emailNotifications: true,
                pushNotifications: true,
                theme: "dark"
            }
        });

        await user.save();

        // Give referrer their bonus
        if (referrer) {
            await addBonus(referrer._id, "REFERRAL");

            // Notify referrer
            if (referrer.addNotification) {
                await referrer.addNotification({
                    message: `🎉 ${username} joined using your referral code! You earned ${BONUSES.REFERRAL.amount} coins!`,
                    type: "system",
                    amount: BONUSES.REFERRAL.amount
                });
            }
        }

        // Generate token
        const token = generateToken(user._id);

        // Send welcome email
        await sendEmail(
            user.email,
            "Welcome to World Studio! 🎉",
            `
                <h1>Welcome to World Studio, ${username}!</h1>
                <p>Your account has been created successfully.</p>
                <p>You've received <strong>${initialBonus} coins</strong> as a welcome bonus!</p>
                <p>Start streaming, creating, and earning today!</p>
                <a href="https://world-studio.live">Visit World Studio</a>
            `
        );

        console.log(`✅ New user registered: ${username} (${email})`);

        res.status(201).json({
            success: true,
            _id: user._id,
            userId: user._id,
            username: user.username,
            displayName: user.displayName,
            email: user.email,
            avatar: user.avatar,
            bio: user.bio,
            followers: [],
            following: [],
            followersCount: 0,
            followingCount: 0,
            wallet: user.wallet,
            role: user.role,
            referralCode: user.referralCode,
            token,
            welcomeBonus: initialBonus,
            message: `🎉 Welcome! You received ${initialBonus} coins!`
        });
    } catch (err) {
        console.error("❌ Register error:", err);
        res.status(500).json({
            success: false,
            error: err.message || "Registration failed"
        });
    }
});

// ===========================================
// LOGIN
// ===========================================

/**
 * POST /api/auth/login
 * Login user
 */
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: "Email and password are required"
            });
        }

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            return res.status(401).json({
                success: false,
                error: "Invalid email or password"
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: "Invalid email or password"
            });
        }

        // Check if banned
        if (user.isBanned) {
            const banMessage = user.bannedUntil
                ? `Your account is suspended until ${user.bannedUntil.toLocaleDateString()}`
                : "Your account has been permanently suspended";

            return res.status(403).json({
                success: false,
                error: banMessage,
                reason: user.banReason
            });
        }

        // Check if deactivated
        if (user.isDeactivated) {
            return res.status(403).json({
                success: false,
                error: "This account has been deactivated"
            });
        }

        // Initialize wallet if needed
        if (!user.wallet) {
            user.wallet = {
                balance: 0,
                totalReceived: 0,
                totalSpent: 0,
                transactions: [],
            };
        }

        // Daily login bonus
        let dailyBonus = null;
        const now = new Date();
        const lastLogin = user.lastLoginDate ? new Date(user.lastLoginDate) : null;

        if (!lastLogin || lastLogin.toDateString() !== now.toDateString()) {
            user.wallet.balance += BONUSES.DAILY_LOGIN.amount;
            user.wallet.totalReceived += BONUSES.DAILY_LOGIN.amount;
            user.wallet.transactions.unshift({
                type: "bonus",
                amount: BONUSES.DAILY_LOGIN.amount,
                description: BONUSES.DAILY_LOGIN.description,
                status: "completed",
                meta: { bonusType: "DAILY_LOGIN" },
                createdAt: new Date(),
            });
            dailyBonus = BONUSES.DAILY_LOGIN.amount;
        }

        // Update login info
        user.lastLoginDate = now;
        user.lastSeen = now;
        user.lastLogin = now;
        user.loginCount = (user.loginCount || 0) + 1;
        user.lastIp = req.ip || req.headers["x-forwarded-for"]?.split(",")[0];

        await user.save();

        // Generate token
        const token = generateToken(user._id);

        console.log(`✅ User logged in: ${user.username}`);

        const response = {
            success: true,
            _id: user._id,
            userId: user._id,
            username: user.username,
            displayName: user.displayName || user.username,
            email: user.email,
            avatar: user.avatar,
            coverImage: user.coverImage,
            bio: user.bio || "",
            followers: user.followers || [],
            following: user.following || [],
            followersCount: user.followersCount || user.followers?.length || 0,
            followingCount: user.followingCount || user.following?.length || 0,
            wallet: {
                balance: user.wallet.balance,
                totalReceived: user.wallet.totalReceived,
                totalSpent: user.wallet.totalSpent
            },
            notifications: (user.notifications || []).slice(0, 20),
            unreadNotifications: user.unreadNotifications || 0,
            role: user.role,
            isVerified: user.isVerified,
            verificationBadge: user.verificationBadge,
            isPremium: user.isPremium,
            premiumTier: user.premiumTier,
            isLive: user.isLive,
            currentStreamId: user.currentStreamId,
            referralCode: user.referralCode,
            stats: user.stats,
            settings: user.settings,
            emailVerified: user.emailVerified,
            token,
        };

        if (dailyBonus) {
            response.dailyBonus = dailyBonus;
            response.message = `📅 Welcome back! +${dailyBonus} daily login bonus!`;
        }

        res.json(response);
    } catch (err) {
        console.error("❌ Login error:", err);
        res.status(500).json({
            success: false,
            error: err.message || "Login failed"
        });
    }
});

// ===========================================
// GET CURRENT USER
// ===========================================

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId)
            .select("-password -passwordResetToken -passwordResetExpires -wallet.transactions")
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        // Update last seen
        await User.findByIdAndUpdate(req.userId, { lastSeen: new Date() });

        res.json({
            success: true,
            ...user,
            isAdmin: user.role === "admin" || user.email === "menziesalm@gmail.com"
        });
    } catch (err) {
        console.error("❌ Get me error:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// ===========================================
// UPDATE PROFILE
// ===========================================

/**
 * PUT /api/auth/profile
 * Update user profile
 */
router.put("/profile", authMiddleware, async (req, res) => {
    try {
        const {
            username,
            displayName,
            bio,
            avatar,
            coverImage,
            location,
            website,
            socialLinks
        } = req.body;

        const updateData = {};

        // Username change (with validation)
        if (username && username !== req.user?.username) {
            if (username.length < 3 || username.length > 30) {
                return res.status(400).json({
                    success: false,
                    error: "Username must be 3-30 characters"
                });
            }

            if (!/^[a-zA-Z0-9_]+$/.test(username)) {
                return res.status(400).json({
                    success: false,
                    error: "Username can only contain letters, numbers, and underscores"
                });
            }

            // Check if taken
            const existingUser = await User.findOne({
                username: { $regex: new RegExp(`^${username}$`, "i") },
                _id: { $ne: req.userId }
            });

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: "Username already taken"
                });
            }

            updateData.username = username;
        }

        if (displayName !== undefined) updateData.displayName = displayName;
        if (bio !== undefined) updateData.bio = bio.substring(0, 500);
        if (avatar) updateData.avatar = avatar;
        if (coverImage) updateData.coverImage = coverImage;
        if (location !== undefined) updateData.location = location;
        if (website !== undefined) updateData.website = website;
        if (socialLinks) updateData.socialLinks = socialLinks;

        updateData.updatedAt = new Date();

        const user = await User.findByIdAndUpdate(
            req.userId,
            updateData,
            { new: true }
        ).select("-password -passwordResetToken -passwordResetExpires");

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        // Check for profile complete bonus
        let bonusEarned = null;
        if (user.avatar && user.bio?.length >= 10) {
            const bonusResult = await addBonus(user._id, "PROFILE_COMPLETE");
            if (bonusResult) {
                bonusEarned = bonusResult;
            }
        }

        const response = {
            success: true,
            user
        };

        if (bonusEarned) {
            response.bonusEarned = bonusEarned.bonus;
            response.message = `✨ Profile completed! +${bonusEarned.bonus} coins!`;
        }

        res.json(response);
    } catch (err) {
        console.error("❌ Profile update error:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// ===========================================
// CHANGE PASSWORD
// ===========================================

/**
 * PUT /api/auth/password
 * Change password (authenticated)
 */
router.put("/password", authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: "Current password and new password are required"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: "New password must be at least 6 characters"
            });
        }

        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: "Current password is incorrect"
            });
        }

        user.password = newPassword;
        await user.save();

        // Send notification email
        await sendEmail(
            user.email,
            "Password Changed - World Studio",
            `
                <h2>Password Changed</h2>
                <p>Your password was changed on ${new Date().toLocaleString()}.</p>
                <p>If you did not make this change, please contact support immediately.</p>
            `
        );

        console.log(`🔐 Password changed for: ${user.username}`);

        res.json({
            success: true,
            message: "Password updated successfully"
        });
    } catch (err) {
        console.error("❌ Password change error:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// ===========================================
// FORGOT PASSWORD
// ===========================================

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: "Email is required"
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });

        // Always return success to prevent email enumeration
        if (!user) {
            return res.json({
                success: true,
                message: "If an account exists with this email, you will receive a reset link"
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString("hex");
        user.passwordResetToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");
        user.passwordResetExpires = Date.now() + 3600000; // 1 hour

        await user.save();

        // Send reset email
        const resetUrl = `https://world-studio.live/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

        await sendEmail(
            user.email,
            "Password Reset - World Studio",
            `
                <h2>Password Reset Request</h2>
                <p>Click the link below to reset your password:</p>
                <a href="${resetUrl}" style="
                    display: inline-block;
                    padding: 12px 24px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-decoration: none;
                    border-radius: 8px;
                    margin: 16px 0;
                ">Reset Password</a>
                <p>This link expires in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
            `
        );

        console.log(`📧 Password reset requested for: ${user.email}`);

        res.json({
            success: true,
            message: "If an account exists with this email, you will receive a reset link"
        });
    } catch (err) {
        console.error("❌ Forgot password error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to process request"
        });
    }
});

// ===========================================
// RESET PASSWORD
// ===========================================

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post("/reset-password", async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;

        if (!email || !token || !newPassword) {
            return res.status(400).json({
                success: false,
                error: "Email, token, and new password are required"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: "Password must be at least 6 characters"
            });
        }

        // Find user with valid token
        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const user = await User.findOne({
            email: email.toLowerCase(),
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                error: "Invalid or expired reset token"
            });
        }

        // Update password
        user.password = newPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        // Send confirmation email
        await sendEmail(
            user.email,
            "Password Reset Successful - World Studio",
            `
                <h2>Password Reset Successful</h2>
                <p>Your password has been reset successfully.</p>
                <p>You can now log in with your new password.</p>
                <a href="https://world-studio.live/login">Login to World Studio</a>
            `
        );

        console.log(`✅ Password reset successful for: ${user.email}`);

        res.json({
            success: true,
            message: "Password reset successful. You can now login."
        });
    } catch (err) {
        console.error("❌ Reset password error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to reset password"
        });
    }
});

// ===========================================
// EMAIL VERIFICATION
// ===========================================

/**
 * POST /api/auth/send-verification
 * Send email verification
 */
router.post("/send-verification", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        if (user.emailVerified) {
            return res.json({
                success: true,
                message: "Email already verified"
            });
        }

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString("hex");
        user.emailVerificationToken = crypto
            .createHash("sha256")
            .update(verificationToken)
            .digest("hex");
        user.emailVerificationExpires = Date.now() + 24 * 3600000; // 24 hours

        await user.save();

        // Send verification email
        const verifyUrl = `https://world-studio.live/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;

        await sendEmail(
            user.email,
            "Verify Your Email - World Studio",
            `
                <h2>Verify Your Email</h2>
                <p>Click the button below to verify your email address:</p>
                <a href="${verifyUrl}" style="
                    display: inline-block;
                    padding: 12px 24px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-decoration: none;
                    border-radius: 8px;
                    margin: 16px 0;
                ">Verify Email</a>
                <p>This link expires in 24 hours.</p>
            `
        );

        res.json({
            success: true,
            message: "Verification email sent"
        });
    } catch (err) {
        console.error("❌ Send verification error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to send verification email"
        });
    }
});

/**
 * POST /api/auth/verify-email
 * Verify email with token
 */
router.post("/verify-email", async (req, res) => {
    try {
        const { email, token } = req.body;

        if (!email || !token) {
            return res.status(400).json({
                success: false,
                error: "Email and token are required"
            });
        }

        const hashedToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const user = await User.findOne({
            email: email.toLowerCase(),
            emailVerificationToken: hashedToken,
            emailVerificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                error: "Invalid or expired verification token"
            });
        }

        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        // Give verification bonus
        await addBonus(user._id, "EMAIL_VERIFIED");

        console.log(`✅ Email verified for: ${user.email}`);

        res.json({
            success: true,
            message: "Email verified successfully!",
            bonus: BONUSES.EMAIL_VERIFIED.amount
        });
    } catch (err) {
        console.error("❌ Verify email error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to verify email"
        });
    }
});

// ===========================================
// REFERRAL SYSTEM
// ===========================================

/**
 * GET /api/auth/bonuses
 * Get user's referral info
 */
router.get("/bonuses", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId)
            .select("referralCode wallet.transactions");

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        // Calculate bonus statistics
        const bonusTransactions = user.wallet?.transactions?.filter(t => t.type === "bonus") || [];
        const totalBonusEarned = bonusTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);

        res.json({
            success: true,
            referralCode: user.referralCode,
            referralLink: `https://world-studio.live/register?ref=${user.referralCode}`,
            bonusTypes: BONUSES,
            totalBonusEarned,
            recentBonuses: bonusTransactions.slice(0, 10)
        });
    } catch (err) {
        console.error("❌ Get bonuses error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to get bonus info"
        });
    }
});

/**
 * GET /api/auth/referrals
 * Get referral statistics
 */
router.get("/referrals", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId)
            .select("referralCode");

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        // Get referred users
        const referredUsers = await User.find({ referredBy: req.userId })
            .select("username avatar createdAt isVerified")
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        // Calculate earnings
        const totalEarned = referredUsers.length * BONUSES.REFERRAL.amount;

        res.json({
            success: true,
            referralCode: user.referralCode,
            referralLink: `https://world-studio.live/register?ref=${user.referralCode}`,
            totalReferred: referredUsers.length,
            totalEarned,
            bonusPerReferral: BONUSES.REFERRAL.amount,
            referredUsers
        });
    } catch (err) {
        console.error("❌ Get referrals error:", err);
        res.status(500).json({
            success: false,
            error: "Failed to get referral info"
        });
    }
});

// ===========================================
// SETTINGS
// ===========================================

/**
 * PUT /api/auth/settings
 * Update user settings
 */
router.put("/settings", authMiddleware, async (req, res) => {
    try {
        const { settings } = req.body;

        if (!settings) {
            return res.status(400).json({
                success: false,
                error: "Settings are required"
            });
        }

        const user = await User.findByIdAndUpdate(
            req.userId,
            { settings },
            { new: true }
        ).select("settings");

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        res.json({
            success: true,
            settings: user.settings
        });
    } catch (err) {
        console.error("❌ Update settings error:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// ===========================================
// DELETE ACCOUNT
// ===========================================

/**
 * DELETE /api/auth/account
 * Delete user account
 */
router.delete("/account", authMiddleware, async (req, res) => {
    try {
        const { password, reason } = req.body;

        if (!password) {
            return res.status(400).json({
                success: false,
                error: "Password is required to delete account"
            });
        }

        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: "Incorrect password"
            });
        }

        // Soft delete (deactivate)
        user.isDeactivated = true;
        user.deactivatedAt = new Date();
        user.deactivationReason = reason;
        await user.save();

        console.log(`👋 Account deactivated: ${user.username}`);

        res.json({
            success: true,
            message: "Account deactivated successfully"
        });
    } catch (err) {
        console.error("❌ Delete account error:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// ===========================================
// LOGOUT (Token invalidation placeholder)
// ===========================================

/**
 * POST /api/auth/logout
 * Logout (client-side token removal)
 */
router.post("/logout", authMiddleware, async (req, res) => {
    try {
        // Update last seen
        await User.findByIdAndUpdate(req.userId, {
            lastSeen: new Date(),
            isLive: false
        });

        res.json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (err) {
        console.error("❌ Logout error:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// ===========================================
// REFRESH TOKEN
// ===========================================

/**
 * POST /api/auth/refresh
 * Refresh JWT token
 */
router.post("/refresh", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        if (user.isBanned) {
            return res.status(403).json({
                success: false,
                error: "Account is suspended"
            });
        }

        const token = generateToken(user._id);

        res.json({
            success: true,
            token
        });
    } catch (err) {
        console.error("❌ Refresh token error:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

module.exports = router;