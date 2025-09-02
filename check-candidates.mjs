async function checkCandidates() {
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
    
    console.log('Logged in as:', loginData.username);
    
    // Get candidates for job 4
    const candidatesRes = await fetch('http://localhost:5000/api/jobs/4/candidates', {
      headers: { 'Cookie': cookie }
    });
    
    const candidates = await candidatesRes.json();
    
    console.log('\nCandidate Role Analysis:');
    console.log('========================');
    
    let noRoleCount = 0;
    let withRoleCount = 0;
    
    candidates.forEach(c => {
      const hasRole = c.lastRoleTitle && c.lastRoleTitle !== 'Not specified';
      if (!hasRole) {
        noRoleCount++;
        console.log(`❌ ${c.name}: "${c.lastRoleTitle || 'null'}" (${c.yearsExperience || 0} years exp)`);
      } else {
        withRoleCount++;
        console.log(`✓ ${c.name}: "${c.lastRoleTitle}" (${c.yearsExperience || 0} years exp)`);
      }
    });
    
    console.log('\nSummary:');
    console.log(`- Total candidates: ${candidates.length}`);
    console.log(`- With role title: ${withRoleCount} (${Math.round(withRoleCount/candidates.length*100)}%)`);
    console.log(`- Missing role title: ${noRoleCount} (${Math.round(noRoleCount/candidates.length*100)}%)`);
    
    // Check what other data we have for candidates without roles
    console.log('\nCandidates without roles - Available data:');
    candidates.filter(c => !c.lastRoleTitle || c.lastRoleTitle === 'Not specified').forEach(c => {
      console.log(`\n${c.name}:`);
      console.log(`  - Skills: ${c.skills?.length || 0} skills`);
      console.log(`  - Experience: ${c.yearsExperience || 0} years`);
      console.log(`  - Resume text length: ${c.resumeText?.length || 0} chars`);
      if (c.resumeText && c.resumeText.length > 0) {
        // Try to extract role from resume text
        const resumeSnippet = c.resumeText.substring(0, 200);
        console.log(`  - Resume snippet: "${resumeSnippet}..."`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkCandidates();