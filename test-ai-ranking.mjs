async function testAIRanking() {
  try {
    // First login as admin
    const loginRes = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'ResumePicker#Admin2025!Secure'
      })
    });
    
    const loginData = await loginRes.json();
    const cookie = loginRes.headers.get('set-cookie');
    
    console.log('Login successful:', loginData.username);
    
    // Test AI ranking on job 4
    console.log('Testing AI ranking for job 4...');
    const rankRes = await fetch('http://localhost:5000/api/jobs/4/ai-rank', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': cookie
      }
    });
    
    const rankData = await rankRes.text();
    console.log('Response status:', rankRes.status);
    console.log('Response:', rankData);
    
    if (!rankRes.ok) {
      console.error('AI Ranking failed with status:', rankRes.status);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAIRanking();