const MAX_PHOTO_BYTES = 450 * 1024;

async function photoDirectory(userId: string, create = false) {
    if (!navigator.storage?.getDirectory) {
        throw new Error('Sistemul de fișiere local necesită un browser compatibil și localhost sau HTTPS.');
    }
    const root = await navigator.storage.getDirectory();
    const photos = await root.getDirectoryHandle('film-photos', { create });
    return photos.getDirectoryHandle(userId, { create });
}

export async function readPhoto(userId: string, photoId: string) {
    try {
        const directory = await photoDirectory(userId);
        return await (await directory.getFileHandle(photoId + '.jpg')).getFile();
    } catch (error) {
        if (error instanceof DOMException && error.name === 'NotFoundError') return null;
        throw error;
    }
}

export async function writePhoto(userId: string, photoId: string, blob: Blob) {
    const directory = await photoDirectory(userId, true);
    const file = await directory.getFileHandle(photoId + '.jpg', { create: true });
    const stream = await file.createWritable();
    try {
        await stream.write(blob);
        await stream.close();
    } catch (error) {
        await stream.abort().catch(() => {});
        throw error;
    }
}

export async function compressPhoto(source: CanvasImageSource, width: number, height: number) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context || width <= 0 || height <= 0) throw new Error('Imaginea nu a putut fi citită.');
    let scale = Math.min(1, 1280 / Math.max(width, height));

    for (let attempt = 0; attempt < 5; attempt++) {
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(source, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
        if (blob && blob.size <= MAX_PHOTO_BYTES) return blob;
        scale *= 0.7;
    }
    throw new Error('Fotografia este prea mare.');
}

export async function photoBase64(userId: string, photoId: string) {
    const file = await readPhoto(userId, photoId);
    if (!file) throw new Error('Fișierul fotografiei nu mai este disponibil pe dispozitiv.');
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(new Blob([file], { type: 'image/jpeg' }));
    });
}
