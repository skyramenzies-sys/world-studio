import React, { useState } from 'react';
import { Camera, Video, Music, Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import NavigationBar from './NavigationBar';
import apiService from '../services/api';

function UploadPage({ currentUser, currentPage, setCurrentPage, onUpload, onLogout }) {
    const [uploadData, setUploadData] = useState({
        title: '',
        description: '',
        type: 'image',
        file: null
    });
    const [preview, setPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState(null); // 'success' or 'error'
    const [uploadMessage, setUploadMessage] = useState('');

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setUploadData({ ...uploadData, file });

            // Create preview
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPreview(reader.result);
                };
                reader.readAsDataURL(file);
            } else if (file.type.startsWith('video/')) {
                setPreview('video');
            } else if (file.type.startsWith('audio/')) {
                setPreview('audio');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!uploadData.file) {
            setUploadStatus('error');
            setUploadMessage('Please select a file to upload');
            return;
        }

        setUploading(true);
        setUploadProgress(0);
        setUploadStatus(null);

        try {
            // Create FormData
            const formData = new FormData();
            formData.append('file', uploadData.file);
            formData.append('title', uploadData.title);
            formData.append('description', uploadData.description);
            formData.append('type', uploadData.type);

            // Upload to backend
            const result = await apiService.uploadFile(formData, (progressEvent) => {
                const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress(progress);
            });

            // Success
            setUploadStatus('success');
            setUploadMessage('Content uploaded successfully! 🚀');

            // Call parent callback to update posts
            if (onUpload) {
                onUpload(result.post);
            }

            // Reset form after 2 seconds
            setTimeout(() => {
                setUploadData({ title: '', description: '', type: 'image', file: null });
                setPreview(null);
                setUploadStatus(null);
                setCurrentPage('home');
            }, 2000);

        } catch (error) {
            setUploadStatus('error');
            setUploadMessage(error.response?.data?.error || 'Upload failed. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAgNHYyaDJ2LTJoLTJ6bTAtOHYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>

            <div className="relative z-10">
                <NavigationBar
                    currentUser={currentUser}
                    currentPage={currentPage}
                    setCurrentPage={setCurrentPage}
                    onLogout={onLogout}
                />

                <div className="max-w-3xl mx-auto p-6">
                    <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
                        <h1 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                            Upload Your Content
                        </h1>

                        {/* Upload Status Messages */}
                        {uploadStatus === 'success' && (
                            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-xl flex items-center gap-3">
                                <CheckCircle className="w-6 h-6 text-green-400" />
                                <span className="text-green-300">{uploadMessage}</span>
                            </div>
                        )}

                        {uploadStatus === 'error' && (
                            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-3">
                                <AlertCircle className="w-6 h-6 text-red-400" />
                                <span className="text-red-300">{uploadMessage}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Content Type */}
                            <div>
                                <label className="block text-sm mb-2">Content Type</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { type: 'image', icon: Camera, label: 'Image' },
                                        { type: 'video', icon: Video, label: 'Video' },
                                        { type: 'audio', icon: Music, label: 'Audio' }
                                    ].map(({ type, icon: Icon, label }) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setUploadData({ ...uploadData, type })}
                                            disabled={uploading}
                                            className={`p-4 rounded-xl border-2 transition-all ${uploadData.type === type
                                                    ? 'border-cyan-400 bg-cyan-400/20'
                                                    : 'border-white/20 bg-white/5 hover:border-white/40'
                                                } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <Icon className="w-6 h-6 mx-auto mb-2" />
                                            <div className="text-sm">{label}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-sm mb-2">Title</label>
                                <input
                                    type="text"
                                    value={uploadData.title}
                                    onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                                    disabled={uploading}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:border-cyan-400 text-white disabled:opacity-50"
                                    placeholder="Give your content an amazing title"
                                    required
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm mb-2">Description</label>
                                <textarea
                                    value={uploadData.description}
                                    onChange={(e) => setUploadData({ ...uploadData, description: e.target.value })}
                                    disabled={uploading}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl focus:outline-none focus:border-cyan-400 text-white h-32 resize-none disabled:opacity-50"
                                    placeholder="Tell us about your content..."
                                    required
                                />
                            </div>

                            {/* File Upload */}
                            <div>
                                <label className="block text-sm mb-2">File</label>
                                <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-cyan-400 transition-colors">
                                    {preview ? (
                                        <div className="mb-4">
                                            {preview === 'video' && (
                                                <div className="text-6xl mb-2">🎬</div>
                                            )}
                                            {preview === 'audio' && (
                                                <div className="text-6xl mb-2">🎵</div>
                                            )}
                                            {preview !== 'video' && preview !== 'audio' && (
                                                <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg mb-2" />
                                            )}
                                            <p className="text-sm text-cyan-400">{uploadData.file?.name}</p>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="w-12 h-12 mx-auto mb-3 text-cyan-400" />
                                            <p className="text-sm text-gray-300">Click to upload or drag and drop</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {uploadData.type === 'image' && 'PNG, JPG, GIF up to 10MB'}
                                                {uploadData.type === 'video' && 'MP4, MOV up to 100MB'}
                                                {uploadData.type === 'audio' && 'MP3, WAV up to 50MB'}
                                            </p>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        disabled={uploading}
                                        className="hidden"
                                        accept={
                                            uploadData.type === 'image' ? 'image/*' :
                                                uploadData.type === 'video' ? 'video/*' : 'audio/*'
                                        }
                                        id="file-upload"
                                    />
                                    <label
                                        htmlFor="file-upload"
                                        className={`inline-block mt-4 px-6 py-2 bg-white/10 rounded-lg cursor-pointer hover:bg-white/20 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {preview ? 'Change File' : 'Select File'}
                                    </label>
                                </div>
                            </div>

                            {/* Upload Progress */}
                            {uploading && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span>Uploading...</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-cyan-500 to-purple-500 h-full transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={uploading || !uploadData.file}
                                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {uploading ? (
                                    <>
                                        <Loader className="w-5 h-5 animate-spin" />
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
            </div>
        </div>
    );
}

export default UploadPage;