'use server';

export async function submitRegistration(formData: FormData) {
  // Extract data (simulating a database save)
  const fullName = formData.get('fullName') as string;
  const kelas = formData.get('kelas') as string;
  const asalSekolah = formData.get('asalSekolah') as string;
  const phone = formData.get('phone') as string;
  const majorInterest = formData.get('majorInterest') as string;

  // Validate basic required fields
  if (!fullName || !kelas || !asalSekolah || !phone || !majorInterest) {
    return { success: false, error: 'All fields are required.' };
  }

  // Generate a random ID like NX-88294
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  const id = `NX-${randomNum}`;

  // In a real application, we would save this to Supabase here
  // For example:
  // await adminClient.from('registrations').insert([{ full_name: fullName, kelas, ... }])

  // Return the processed data and generated ID to the client
  return {
    success: true,
    data: {
      id,
      fullName,
      kelas,
      asalSekolah,
      phone,
      majorInterest,
    }
  };
}
