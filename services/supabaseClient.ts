import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Variáveis de ambiente do Supabase não configuradas no .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to compress images on the client-side
export const compressImage = (file: File, maxWidth: number, maxHeight: number, quality: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string); // fallback to original base64
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

// Helper to upload a resident profile photo to Supabase storage, with automatic bucket verification and fallback to base64
export const uploadResidentPhoto = async (file: File, compressedBase64: string): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `photos/${fileName}`;

    // 1. Try to ensure storage bucket exists
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === 'resident-photos');
      
      if (!bucketExists) {
        await supabase.storage.createBucket('resident-photos', {
          public: true,
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
          fileSizeLimit: 5242880 // 5MB
        });
      }
    } catch (bucketErr) {
      console.warn('Could not verify/create resident-photos bucket, attempting upload anyway:', bucketErr);
    }

    // 2. Convert base64 data URL to Blob for upload
    const res = await fetch(compressedBase64);
    const blob = await res.blob();

    // 3. Upload file
    const { error: uploadErr } = await supabase.storage
      .from('resident-photos')
      .upload(filePath, blob, {
        contentType: file.type || 'image/jpeg',
        upsert: true
      });

    if (uploadErr) {
      console.warn('Supabase storage upload failed, using compressed base64 fallback:', uploadErr);
      return compressedBase64;
    }

    // 4. Get public URL
    const { data } = supabase.storage
      .from('resident-photos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err) {
    console.warn('Failed uploading to Supabase storage, falling back to base64:', err);
    return compressedBase64;
  }
};

// Helper to upload a digitalized prescription document to Supabase storage
export const uploadPrescriptionDocument = async (file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop() || 'pdf';
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `documents/${fileName}`;

  // 1. Try to ensure storage bucket exists
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === 'prescription-documents');
    
    if (!bucketExists) {
      await supabase.storage.createBucket('prescription-documents', {
        public: true,
        fileSizeLimit: 10485760 // 10MB
      });
    }
  } catch (bucketErr) {
    console.warn('Could not verify/create prescription-documents bucket, attempting upload anyway:', bucketErr);
  }

  // 2. Upload file
  const { error: uploadErr } = await supabase.storage
    .from('prescription-documents')
    .upload(filePath, file, {
      contentType: file.type || 'application/pdf',
      upsert: true
    });

  if (uploadErr) {
    throw uploadErr;
  }

  // 3. Get public URL
  const { data } = supabase.storage
    .from('prescription-documents')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

// Helper to upload a user profile photo to Supabase storage, with automatic bucket verification and fallback to base64
export const uploadUserPhoto = async (file: File, compressedBase64: string): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // 1. Try to ensure storage bucket exists
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === 'user-photos');
      
      if (!bucketExists) {
        await supabase.storage.createBucket('user-photos', {
          public: true,
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
          fileSizeLimit: 5242880 // 5MB
        });
      }
    } catch (bucketErr) {
      console.warn('Could not verify/create user-photos bucket, attempting upload anyway:', bucketErr);
    }

    // 2. Convert base64 data URL to Blob for upload
    const res = await fetch(compressedBase64);
    const blob = await res.blob();

    // 3. Upload file
    const { error: uploadErr } = await supabase.storage
      .from('user-photos')
      .upload(filePath, blob, {
        contentType: file.type || 'image/jpeg',
        upsert: true
      });

    if (uploadErr) {
      console.warn('Supabase storage upload failed, using compressed base64 fallback:', uploadErr);
      return compressedBase64;
    }

    // 4. Get public URL
    const { data } = supabase.storage
      .from('user-photos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err) {
    console.warn('Failed uploading to Supabase storage, falling back to base64:', err);
    return compressedBase64;
  }
};

// Helper to upload an institutional compliance document (PDF/image) to Supabase storage
export const uploadComplianceDocument = async (file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop() || 'pdf';
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `compliance/${fileName}`;

  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === 'compliance-documents');

    if (!bucketExists) {
      await supabase.storage.createBucket('compliance-documents', {
        public: true,
        fileSizeLimit: 10485760,
      });
    }
  } catch (bucketErr) {
    console.warn('Could not verify/create compliance-documents bucket:', bucketErr);
  }

  const { error: uploadErr } = await supabase.storage
    .from('compliance-documents')
    .upload(filePath, file, {
      contentType: file.type || 'application/pdf',
      upsert: true,
    });

  if (uploadErr) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  const { data } = supabase.storage
    .from('compliance-documents')
    .getPublicUrl(filePath);

  return data.publicUrl;
};
