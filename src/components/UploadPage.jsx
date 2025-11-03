import React, { useState } from 'react';
import { Upload, X, Image, Video, Music, FileText, ArrowLeft, AlertCircle, DollarSign, TrendingUp } from 'lucide-react';
import NavigationBar from './NavigationBar';
import { compressImage, estimateBase64Size, getStorageInfo } from '../storageUtils';

function UploadPage({ currentUser, currentPage, setCurrentPage, onUpload, onLogout }) {
    const [uploadData, setUploadData] = useState({
        title: '',
        description: '',
        type: 'image',
        category: 'art',
        fileUrl: null,
        fileName: '',
        fileSize: 0,
        isFree: true,
        price: 0,
        isPremium: false
    });
    const [previewUrl, setPreviewUrl] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState('');

    const categories = [
        { id: 'art', name: '🎨 Art', icon: '🎨' },
        { id: 'photography', name: '📸 Photography', icon: '📸' },
        { id: 'video', name: '🎬 Video', icon: '🎬' },
        { id: 'music', name: '🎵 Music', icon: '🎵' },
        { id: 'design', name: '✨ Design', icon: '✨' },
        { id: 'animation', name: '🎭 Animation', icon: '🎭' },
        { id: 'other', name: '📦 Other', icon: '📦' }
    ];

    const contentTypes = [
        { id: 'image', name: 'Image', icon: Image, accept: 'image/*' },
        { id: 'video', name: 'Video', icon: Video, accept: 'video/*' },
        { id: 'audio', name: 'Audio', icon: Music, accept: 'audio/*' }
    ];

    // Converteer file naar base64 voor opslag in localStorage
    const fileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    };

    const handleFileSelect = async (file) => {
        if (!file) return;

        // Check localStorage ruimte
        const storageInfo = getStorageInfo();
        console.log('💾 Storage info:', storageInfo);

        if (parseFloat(storageInfo.available) < 1) {
            alert(`⚠️ LocalStorage bijna vol!\n\nGebruikt: ${storageInfo.used}MB / ${storageInfo.total}MB\n\nVerwijder oude posts via je profiel of gebruik de Clear Database functie.`);
            return;
        }

        // Check file size - Maximum 10MB voor origineel bestand
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            alert('❌ Bestand is te groot! Maximum 10MB toegestaan.');
            return;
        }

        setUploading(true);

        try {
            // Converteer naar base64
            const base64 = await fileToBase64(file);

            // Bepaal type op basis van file
            let type = 'image';
            if (file.type.startsWith('video/')) type = 'video';
            if (file.type.startsWith('audio/')) type = 'audio';

            let finalBase64 = base64;
            let wasCompressed = false;

            // ✅ AUTOMATISCHE COMPRESSIE voor afbeeldingen
            if (type === 'image') {
                const originalSize = estimateBase64Size(base64);
                console.log(`📸 Original image size: ${originalSize.toFixed(2)}MB`);

                // Compress als groter dan 1MB
                if (originalSize > 1) {
                    console.log('🔄 Compressing image...');
                    finalBase64 = await compressImage(base64, 1200, 0.7);
                    const compressedSize = estimateBase64Size(finalBase64);
                    console.log(`✅ Compressed to: ${compressedSize.toFixed(2)}MB`);
                    wasCompressed = true;

                    // Check of nog steeds te groot
                    if (compressedSize > 3) {
                        alert('❌ Afbeelding is te groot, zelfs na compressie. Probeer een kleinere afbeelding.');
                        setUploading(false);
                        return;
                    }
                }
            }

            // ⚠️ Video's zijn erg groot - waarschuwing
            if (type === 'video') {
                const videoSize = estimateBase64Size(base64);
                if (videoSize > 5) {
                    const confirmUpload = window.confirm(
                        `⚠️ Deze video is ${videoSize.toFixed(1)}MB!\n\n` +
                        `LocalStorage heeft beperkte ruimte (${storageInfo.available}MB beschikbaar).\n\n` +
                        `Wil je toch uploaden?\n\n` +
                        `Tip: Gebruik kortere video's (<30 sec) of lagere kwaliteit.`
                    );
                    if (!confirmUpload) {
                        setUploading(false);
                        return;
                    }
                }
            }

            setUploadData({
                ...uploadData,
                type: type,
                fileUrl: finalBase64,
                fileName: file.name,
                fileSize: file.size
            });

            // Set preview URL
            if (type === 'image' || type === 'video') {
                setPreviewUrl(finalBase64);
            } else {
                setPreviewUrl(null);
            }

            if (wasCompressed) {
                setSuccess('✅ Afbeelding gecomprimeerd voor optimale opslag!');
                setTimeout(() => setSuccess(''), 3000);
            }

        } catch (error) {
            console.error('Error reading file:', error);
            alert('❌ Error bij het lezen van het bestand');
        } finally {
            setUploading(false);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!uploadData.title.trim()) {
            alert('❌ Voeg een titel toe!');
            return;
        }

        if (!uploadData.fileUrl) {
            alert('❌ Upload een bestand!');
            return;
        }

        // Validatie voor paid content
        if (!uploadData.isFree && uploadData.price <= 0) {
            alert('❌ Stel een prijs in voor betaalde content!');
            return;
        }

        setUploading(true);

        // Simuleer upload delay
        setTimeout(() => {
            onUpload({
                title: uploadData.title,
                description: uploadData.description,
                type: uploadData.type,
                category: uploadData.category,
                fileUrl: uploadData.fileUrl,
                fileName: uploadData.fileName,
                fileSize: uploadData.fileSize,
                isFree: uploadData.isFree,
                price: uploadData.price,
                isPremium: uploadData.isPremium,
                purchasedBy: [] // Array van user IDs die dit gekocht hebben
            });

            // Reset form
            setUploadData({
                title: '',
                description: '',
                type: 'image',
                category: 'art',
                fileUrl: null,
                fileName: '',
                fileSize: 0,
                isFree: true,
                price: 0,
                isPremium: false
            });
            setPreviewUrl(null);
            setUploading(false);
        }, 1000);
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };

    const selectedContentType = contentTypes.find(t => t.id === uploadData.type);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <NavigationBar
                currentUser={currentUser}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                onLogout={onLogout}
            />

            <div className="max-w-4xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => setCurrentPage('home')}
                        className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-4"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back to Home
                    </button>
                    <h1 className="text-4xl font-bold text-white mb-2">Upload Content</h1>
                    <p className="text-white/60">Share your creativity with the world 🌍</p>

                    {/* Storage Info */}
                    {(() => {
                        const storageInfo = getStorageInfo();
                        const percentage = parseFloat(storageInfo.percentage);
                        let colorClass = 'from-green-500 to-emerald-500';
                        if (percentage > 70) colorClass = 'from-yellow-500 to-orange-500';
                        if (percentage > 90) colorClass = 'from-red-500 to-rose-500';

                        return (
                            <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-white/80 text-sm">Storage gebruikt:</span>
                                    <span className="text-white font-semibold text-sm">
                                        {storageInfo.used}MB / {storageInfo.total}MB ({storageInfo.percentage}%)
                                    </span>
                                </div>
                                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full bg-gradient-to-r ${colorClass} transition-all`}
                                        style={{ width: `${storageInfo.percentage}%` }}
                                    ></div>
                                </div>
                                {percentage > 80 && (
                                    <div className="mt-2 flex items-start gap-2 text-yellow-400 text-xs">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        <span>Storage bijna vol! Overweeg oude posts te verwijderen.</span>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>

                {/* Success Message */}
                {success && (
                    <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-xl text-green-300 text-sm">
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Content Type Selection */}
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                        <label className="block text-white font-semibold mb-4">Content Type</label>
                        <div className="grid grid-cols-3 gap-4">
                            {contentTypes.map(type => {
                                const Icon = type.icon;
                                return (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => setUploadData({ ...uploadData, type: type.id })}
                                        className={`p-4 rounded-xl border-2 transition-all ${uploadData.type === type.id
                                            ? 'border-cyan-500 bg-cyan-500/20'
                                            : 'border-white/20 bg-white/5 hover:bg-white/10'
                                            }`}
                                    >
                                        <Icon className="w-8 h-8 mx-auto mb-2 text-white" />
                                        <p className="text-white font-medium">{type.name}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* File Upload */}
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                        <label className="block text-white font-semibold mb-4">File</label>

                        {!previewUrl ? (
                            <div
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${dragActive
                                    ? 'border-cyan-500 bg-cyan-500/10'
                                    : 'border-white/30 hover:border-white/50'
                                    }`}
                            >
                                <Upload className="w-16 h-16 mx-auto mb-4 text-white/40" />
                                <p className="text-white mb-2">Drag and drop your file here</p>
                                <p className="text-white/60 text-sm mb-4">or</p>
                                <label className="inline-block px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-semibold cursor-pointer hover:shadow-lg transition-all">
                                    Browse Files
                                    <input
                                        type="file"
                                        accept={selectedContentType?.accept}
                                        onChange={(e) => handleFileSelect(e.target.files[0])}
                                        className="hidden"
                                    />
                                </label>
                                <p className="text-white/40 text-xs mt-4">Maximum file size: 10MB</p>
                            </div>
                        ) : (
                            <div className="relative">
                                {/* Preview */}
                                <div className="rounded-xl overflow-hidden bg-black/50 mb-4">
                                    {uploadData.type === 'image' && (
                                        <img
                                            src={previewUrl}
                                            alt="Preview"
                                            className="w-full h-auto max-h-96 object-contain"
                                        />
                                    )}
                                    {uploadData.type === 'video' && (
                                        <video
                                            src={previewUrl}
                                            controls
                                            className="w-full h-auto max-h-96"
                                        />
                                    )}
                                    {uploadData.type === 'audio' && (
                                        <div className="p-8 text-center">
                                            <Music className="w-24 h-24 mx-auto mb-4 text-white/40" />
                                            <audio src={uploadData.fileUrl} controls className="w-full" />
                                        </div>
                                    )}
                                </div>

                                {/* File Info */}
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-5 h-5 text-cyan-400" />
                                        <div>
                                            <p className="text-white font-medium text-sm">{uploadData.fileName}</p>
                                            <p className="text-white/60 text-xs">{formatFileSize(uploadData.fileSize)}</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setUploadData({ ...uploadData, fileUrl: null, fileName: '', fileSize: 0 });
                                            setPreviewUrl(null);
                                        }}
                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5 text-white" />
                                    </button>
                                </div>

                                {/* Change File Button */}
                                <label className="mt-4 block text-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl cursor-pointer transition-all">
                                    Change File
                                    <input
                                        type="file"
                                        accept={selectedContentType?.accept}
                                        onChange={(e) => handleFileSelect(e.target.files[0])}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        )}
                    </div>

                    {/* Title */}
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                        <label className="block text-white font-semibold mb-4">Title *</label>
                        <input
                            type="text"
                            value={uploadData.title}
                            onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                            placeholder="Give your content a catchy title..."
                            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                        <label className="block text-white font-semibold mb-4">Description</label>
                        <textarea
                            value={uploadData.description}
                            onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                            placeholder="Tell us about your content..."
                            rows={4}
                            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                        />
                    </div>

                    {/* Category */}
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                        <label className="block text-white font-semibold mb-4">Category</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setUploadData({ ...uploadData, category: cat.id })}
                                    className={`p-3 rounded-xl border transition-all ${uploadData.category === cat.id
                                        ? 'border-cyan-500 bg-cyan-500/20'
                                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                                        }`}
                                >
                                    <span className="text-2xl block mb-1">{cat.icon}</span>
                                    <span className="text-white text-sm">{cat.name.split(' ')[1]}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 💰 PRICING & MONETIZATION */}
                    <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-lg rounded-2xl p-6 border-2 border-yellow-500/30">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg">
                                <DollarSign className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <label className="block text-white font-bold text-lg">Monetization</label>
                                <p className="text-white/60 text-sm">Sell your content or make it free</p>
                            </div>
                        </div>

                        {/* Free vs Paid Toggle */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <button
                                type="button"
                                onClick={() => setUploadData({ ...uploadData, isFree: true, price: 0 })}
                                className={`p-4 rounded-xl border-2 transition-all ${uploadData.isFree
                                    ? 'border-green-500 bg-green-500/20'
                                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                                    }`}
                            >
                                <div className="text-3xl mb-2">🆓</div>
                                <div className="font-bold text-white">Free</div>
                                <div className="text-xs text-white/60">Everyone can view</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setUploadData({ ...uploadData, isFree: false, price: 5 })}
                                className={`p-4 rounded-xl border-2 transition-all ${!uploadData.isFree
                                    ? 'border-yellow-500 bg-yellow-500/20'
                                    : 'border-white/20 bg-white/5 hover:bg-white/10'
                                    }`}
                            >
                                <div className="text-3xl mb-2">💰</div>
                                <div className="font-bold text-white">Paid</div>
                                <div className="text-xs text-white/60">Set your price</div>
                            </button>
                        </div>

                        {/* Price Input (only if not free) */}
                        {!uploadData.isFree && (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-white font-semibold mb-3">Set Your Price</label>
                                    <div className="flex gap-3 mb-3">
                                        {[1, 5, 10, 20, 50].map(price => (
                                            <button
                                                key={price}
                                                type="button"
                                                onClick={() => setUploadData({ ...uploadData, price })}
                                                className={`flex-1 py-2 rounded-lg font-semibold transition-all ${uploadData.price === price
                                                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                                                    : 'bg-white/10 text-white hover:bg-white/20'
                                                    }`}
                                            >
                                                ${price}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                                        <input
                                            type="number"
                                            value={uploadData.price}
                                            onChange={(e) => setUploadData({ ...uploadData, price: Math.max(0, parseInt(e.target.value) || 0) })}
                                            min="0"
                                            step="1"
                                            placeholder="Custom price"
                                            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                                        />
                                    </div>
                                    <p className="text-white/60 text-xs mt-2">
                                        💡 Tip: Set a fair price for your content. You'll earn {uploadData.price ? `$${uploadData.price}` : '$0'} per purchase.
                                    </p>
                                </div>

                                {/* Premium Badge Option */}
                                <div className="flex items-start gap-3 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                                    <input
                                        type="checkbox"
                                        id="isPremium"
                                        checked={uploadData.isPremium}
                                        onChange={(e) => setUploadData({ ...uploadData, isPremium: e.target.checked })}
                                        className="mt-1 w-5 h-5 rounded border-2 border-purple-500 bg-white/10 checked:bg-purple-500 focus:ring-2 focus:ring-purple-500/50"
                                    />
                                    <label htmlFor="isPremium" className="flex-1 cursor-pointer">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-white">Premium Content</span>
                                            <span className="px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded text-white text-xs font-bold">
                                                ⭐ PREMIUM
                                            </span>
                                        </div>
                                        <p className="text-white/60 text-sm">
                                            Mark as exclusive premium content. Shows a special badge and appears in premium section.
                                        </p>
                                    </label>
                                </div>

                                {/* Revenue Calculator */}
                                {uploadData.price > 0 && (
                                    <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp className="w-5 h-5 text-green-400" />
                                            <span className="font-bold text-white">Your Earnings Breakdown</span>
                                        </div>

                                        {/* Per Sale Breakdown */}
                                        <div className="mb-3 p-3 bg-white/5 rounded-lg">
                                            <div className="text-sm text-white/60 mb-2">Per Sale:</div>
                                            <div className="space-y-1 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-white/80">Sale Price:</span>
                                                    <span className="text-white font-semibold">${uploadData.price.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-green-400">You earn (90%):</span>
                                                    <span className="text-green-400 font-bold">${(uploadData.price * 0.9).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-white/40">Platform fee (10%):</span>
                                                    <span className="text-white/40">-${(uploadData.price * 0.1).toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Potential Earnings */}
                                        <div className="text-xs text-white/60 mb-2">Potential Earnings:</div>
                                        <div className="grid grid-cols-3 gap-3 text-center">
                                            <div>
                                                <div className="text-xs text-white/60 mb-1">10 sales</div>
                                                <div className="text-lg font-bold text-green-400">${(uploadData.price * 10 * 0.9).toFixed(0)}</div>
                                                <div className="text-xs text-white/40">($${(uploadData.price * 10 * 0.1).toFixed(0)} fee)</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-white/60 mb-1">50 sales</div>
                                                <div className="text-lg font-bold text-green-400">${(uploadData.price * 50 * 0.9).toFixed(0)}</div>
                                                <div className="text-xs text-white/40">($${(uploadData.price * 50 * 0.1).toFixed(0)} fee)</div>
                                            </div>
                                            <div>
                                                <div className="text-xs text-white/60 mb-1">100 sales</div>
                                                <div className="text-lg font-bold text-green-400">${(uploadData.price * 100 * 0.9).toFixed(0)}</div>
                                                <div className="text-xs text-white/40">($${(uploadData.price * 100 * 0.1).toFixed(0)} fee)</div>
                                            </div>
                                        </div>

                                        <div className="mt-3 text-xs text-center text-white/60">
                                            💡 You keep <span className="text-green-400 font-bold">90%</span> of all sales
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={uploading || !uploadData.fileUrl}
                        className="w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                    >
                        {uploading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="w-5 h-5" />
                                Publish Content
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default UploadPage;