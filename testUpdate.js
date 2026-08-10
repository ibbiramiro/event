

async function testUpdate() {
  const url = 'http://localhost:3000/api/guests'; // wait, I can just call the apps script directly
  const appScriptUrl = 'https://script.google.com/macros/s/AKfycbxs6ei8aqHQmrezSs8sZ_OS0frWR6kG3QZrPEW9VeZG4L-FWR6LhrID-LRY-L-O2ejX3Q/exec';
  
  const formData = new URLSearchParams();
  formData.append('action', 'update');
  formData.append('rowNumber', '5'); // Row 5 (Eileen Metta)
  formData.append('totalHadir', '2'); // Try updating total hadir to 2
  formData.append('Total Hadir', '2');
  formData.append('Total Hadir (#orang)', '2');
  
  const res = await fetch(appScriptUrl, {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  
  const text = await res.text();
  console.log('Result:', text);
}

testUpdate();
