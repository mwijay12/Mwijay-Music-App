export interface CloudinaryResponse {
    secure_url: string;
    public_id: string;
    folder: string;
    duration?: number;
}

export const uploadToCloudinary = async (file: File | Blob): Promise<CloudinaryResponse> => {
    // 1. Get signature from our server
    const sigResponse = await fetch('/api/cloudinary-signature');
    if (!sigResponse.ok) throw new Error('Failed to get Cloudinary signature');
    const { signature, timestamp, apiKey, cloudName } = await sigResponse.json();

    // 2. Prepare Form Data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('signature', signature);
    formData.append('timestamp', timestamp.toString());
    formData.append('api_key', apiKey);
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'ml_default');

    // 3. Upload directly to Cloudinary
    const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
        method: 'POST',
        body: formData
    });

    if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        throw new Error(error.message || 'Cloudinary upload failed');
    }

    return await uploadResponse.json();
};
