async function testLogin() {
  const url = 'http://localhost:5000/api/auth/login';
  const credentials = {
    username: 'admin',
    password: 'ResumePicker#Admin2025!Secure'
  };

  console.log('Testing login with credentials:');
  console.log('Username:', credentials.username);
  console.log('Password:', credentials.password);
  console.log('URL:', url);
  console.log('---');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials)
    });

    const text = await response.text();
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.get('content-type'));
    
    if (response.ok) {
      console.log('✅ Login successful!');
      try {
        const data = JSON.parse(text);
        console.log('Response data:', data);
      } catch {
        console.log('Response text:', text);
      }
    } else {
      console.log('❌ Login failed!');
      console.log('Response:', text);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testLogin();