export interface R2UploadResponse {
    secure_url: string;
    public_id: string;
    bucket: string;
    duration?: number;
}

export const uploadToR2 = async (file: File, filename?: string): Promise<R2UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file, filename || file.name);

    const response = await fetch('/api/r2/upload', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || 'R2 upload failed');
    }

    return await response.json();
};
