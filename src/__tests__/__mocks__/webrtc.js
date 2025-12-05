global.RTCPeerConnection = jest.fn().mockImplementation(() => ({
    addTrack: jest.fn(),
    addIceCandidate: jest.fn(),
    setLocalDescription: jest.fn(),
    setRemoteDescription: jest.fn(),
    createOffer: jest.fn().mockResolvedValue({ type: "offer" }),
    createAnswer: jest.fn().mockResolvedValue({ type: "answer" }),
    close: jest.fn()
}));

global.MediaStream = jest.fn();
global.MediaStreamTrack = jest.fn();
