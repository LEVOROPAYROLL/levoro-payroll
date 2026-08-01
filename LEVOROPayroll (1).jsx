import React, { useState, useEffect } from 'react';

const LEVOROPayroll = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [companies, setCompanies] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [paystubs, setPaystubs] = useState([]);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('');
  const [newEmployeePayPeriod, setNewEmployeePayPeriod] = useState('weekly');
  const [newEmployeeRate, setNewEmployeeRate] = useState('15.00');

  // Load data from storage
  useEffect(() => {
    const loadData = async () => {
      try {
        const compResult = await window.storage.get('levoro_companies');
        const empResult = await window.storage.get('levoro_employees');
        const tsResult = await window.storage.get('levoro_timesheets');
        const psResult = await window.storage.get('levoro_paystubs');
        if (compResult && compResult.value) setCompanies(JSON.parse(compResult.value));
        if (empResult && empResult.value) setEmployees(JSON.parse(empResult.value));
        if (tsResult && tsResult.value) setTimesheets(JSON.parse(tsResult.value));
        if (psResult && psResult.value) setPaystubs(JSON.parse(psResult.value));
      } catch (err) {
        console.log('Loading data');
      }
    };
    loadData();
  }, []);

  // Save data to storage
  useEffect(() => {
    const saveData = async () => {
      try {
        await window.storage.set('levoro_companies', JSON.stringify(companies));
        await window.storage.set('levoro_employees', JSON.stringify(employees));
        await window.storage.set('levoro_timesheets', JSON.stringify(timesheets));
        await window.storage.set('levoro_paystubs', JSON.stringify(paystubs));
      } catch (err) {
        console.error('Failed to save data');
      }
    };
    saveData();
  }, [companies, employees, timesheets, paystubs]);

  // Login handler
  const handleLogin = (e) => {
    e.preventDefault();
    if (loginEmail === 'admin@levoro.com' && loginPassword === 'admin123') {
      setCurrentUser({ email: 'admin@levoro.com' });
      setUserRole('admin');
      setLoginEmail('');
      setLoginPassword('');
    } else {
      const user = employees.find(emp => emp.email === loginEmail && emp.password === loginPassword);
      if (user) {
        setCurrentUser(user);
        setSelectedCompany(user.companyId);
        if (user.role === 'manager') {
          setUserRole('manager');
        } else {
          setUserRole('employee');
        }
        setLoginEmail('');
        setLoginPassword('');
      } else {
        alert('Invalid credentials');
      }
    }
  };

  // Add company
  const handleAddCompany = (e) => {
    e.preventDefault();
    const newComp = {
      id: Date.now(),
      name: newCompanyName,
      createdAt: new Date().toISOString()
    };
    setCompanies([...companies, newComp]);
    setNewCompanyName('');
    setShowAddCompany(false);
  };

  // Delete company
  const deleteCompany = (companyId) => {
    setCompanies(companies.filter(c => c.id !== companyId));
    setEmployees(employees.filter(e => e.companyId !== companyId));
    setTimesheets(timesheets.filter(t => {
      const emp = employees.find(e => e.id === t.employeeId);
      return emp?.companyId !== companyId;
    }));
  };

  // Add employee
  const handleAddEmployee = (e) => {
    e.preventDefault();
    const newEmp = {
      id: Date.now(),
      name: newEmployeeName,
      email: newEmployeeEmail,
      password: 'password123',
      payPeriod: newEmployeePayPeriod,
      hourlyRate: parseFloat(newEmployeeRate),
      companyId: selectedCompany,
      role: 'employee',
      createdAt: new Date().toISOString()
    };
    setEmployees([...employees, newEmp]);
    setNewEmployeeName('');
    setNewEmployeeEmail('');
    setNewEmployeePayPeriod('weekly');
    setNewEmployeeRate('15.00');
    setShowAddEmployee(false);
  };

  // Get week/period start
  const getPeriodStart = (date = new Date(), payPeriod = 'weekly') => {
    const d = new Date(date);
    if (payPeriod === 'weekly') {
      d.setDate(d.getDate() - d.getDay());
    } else {
      d.setDate(d.getDate() - d.getDay());
      const weeksSinceStart = Math.floor(d.getDate() / 14);
      d.setDate(weeksSinceStart * 14 + 1);
    }
    return d;
  };

  // Calculate period hours
  const getPeriodHours = (employeeId, periodStart, payPeriod) => {
    const periodEnd = new Date(periodStart);
    if (payPeriod === 'weekly') {
      periodEnd.setDate(periodEnd.getDate() + 6);
    } else {
      periodEnd.setDate(periodEnd.getDate() + 13);
    }
    
    return timesheets.filter(ts => {
      if (ts.employeeId !== employeeId) return false;
      const tsDate = new Date(ts.date);
      return tsDate >= periodStart && tsDate <= periodEnd;
    });
  };

  // Get paystub status
  const getPaystubStatus = (employeeId, periodStart) => {
    return paystubs.find(p => p.employeeId === employeeId && p.periodStart === periodStart.toISOString().split('T')[0]);
  };

  // Approve paystub
  const approvePaystub = (employeeId, periodStart) => {
    const periodEntries = getPeriodHours(employeeId, periodStart, employees.find(e => e.id === employeeId)?.payPeriod || 'weekly');
    const totalHours = periodEntries.reduce((sum, ts) => sum + parseFloat(ts.hours), 0);
    const emp = employees.find(e => e.id === employeeId);
    
    const paystubId = `${employeeId}-${periodStart.toISOString().split('T')[0]}`;
    
    setPaystubs([...paystubs.filter(p => p.id !== paystubId), {
      id: paystubId,
      employeeId,
      periodStart: periodStart.toISOString().split('T')[0],
      status: 'approved',
      totalHours,
      hourlyRate: emp.hourlyRate,
      grossPay: (totalHours * emp.hourlyRate).toFixed(2),
      approvedBy: currentUser.name,
      approvedAt: new Date().toISOString()
    }]);
  };

  // Reject paystub
  const rejectPaystub = (employeeId, periodStart) => {
    setPaystubs(paystubs.filter(p => !(p.employeeId === employeeId && p.periodStart === periodStart.toISOString().split('T')[0])));
  };

  const addTimeEntry = (date, startTime, endTime) => {
    const hours = calculateHours(startTime, endTime);
    const newEntry = {
      id: Date.now(),
      employeeId: currentUser.id,
      date,
      startTime,
      endTime,
      hours,
      submittedAt: new Date().toISOString()
    };
    setTimesheets([...timesheets, newEntry]);
  };

  const calculateHours = (start, end) => {
    if (!start || !end) return 0;
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    return Math.max(0, (endMin - startMin) / 60).toFixed(2);
  };

  const deleteTimeEntry = (id) => {
    setTimesheets(timesheets.filter(ts => ts.id !== id));
  };

  const exportPayroll = () => {
    const companyName = companies.find(c => c.id === selectedCompany)?.name || 'LEVORO';
    let csv = 'Company,Employee,Period Start,Total Hours,Hourly Rate,Gross Pay,Status,Approved By,Approved Date\n';
    
    const companyEmployees = employees.filter(e => e.companyId === selectedCompany);
    companyEmployees.forEach(emp => {
      const approvedPaystubs = paystubs.filter(p => p.employeeId === emp.id && p.status === 'approved');
      approvedPaystubs.forEach(ps => {
        csv += `${companyName},${emp.name},${ps.periodStart},${ps.totalHours.toFixed(2)},${ps.hourlyRate.toFixed(2)},$${ps.grossPay},Approved,${ps.approvedBy},${new Date(ps.approvedAt).toLocaleDateString()}\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${companyName}_Approved_Payroll_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Employee view
  if (userRole === 'employee' && currentUser) {
    const employee = employees.find(e => e.id === currentUser.id);
    const periodStart = getPeriodStart(new Date(), employee?.payPeriod || 'weekly');
    const periodEnd = new Date(periodStart);
    if (employee?.payPeriod === 'weekly') {
      periodEnd.setDate(periodEnd.getDate() + 6);
    } else {
      periodEnd.setDate(periodEnd.getDate() + 13);
    }
    
    const periodTimesheets = getPeriodHours(currentUser.id, periodStart, employee?.payPeriod || 'weekly');
    const totalHours = periodTimesheets.reduce((sum, ts) => sum + parseFloat(ts.hours), 0);
    const paystubStatus = getPaystubStatus(currentUser.id, periodStart);
    const companyName = companies.find(c => c.id === selectedCompany)?.name || 'LEVORO';

    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(periodStart);
      date.setDate(date.getDate() + i);
      return date;
    });

    return (
      <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 500 }}>{companyName}</h1>
          <button onClick={() => { setCurrentUser(null); setUserRole(null); setSelectedCompany(null); }} style={{
            padding: '8px 16px',
            fontSize: '13px',
            background: 'var(--surface-1)',
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)'
          }}>Logout</button>
        </div>

        <div style={{ background: 'var(--surface-1)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
          <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Welcome, {currentUser.name}</p>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 500 }}>
            {employee?.payPeriod === 'weekly' ? 'Week' : 'Pay Period'} of {periodStart.toLocaleDateString()} - {periodEnd.toLocaleDateString()}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: '8px' }}>
              <p style={{ margin: '0', fontSize: '12px', color: 'var(--text-secondary)' }}>Total Hours</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 500 }}>{totalHours.toFixed(2)}</p>
            </div>
            <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: '8px' }}>
              <p style={{ margin: '0', fontSize: '12px', color: 'var(--text-secondary)' }}>Rate/Hour</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 500 }}>${employee?.hourlyRate.toFixed(2)}</p>
            </div>
            <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: '8px' }}>
              <p style={{ margin: '0', fontSize: '12px', color: 'var(--text-secondary)' }}>Paystub Status</p>
              <p style={{ 
                margin: '4px 0 0 0', 
                fontSize: '14px', 
                fontWeight: 500,
                color: paystubStatus?.status === 'approved' ? '#1d9e75' : '#ba7517'
              }}>
                {paystubStatus?.status === 'approved' ? '✓ Approved' : '⏳ Pending'}
              </p>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 500 }}>Enter Your Hours</h3>
          {weekDays.map((day, idx) => {
            const dateStr = day.toISOString().split('T')[0];
            const dayEntry = periodTimesheets.find(ts => ts.date === dateStr);

            return (
              <div key={idx} style={{
                background: 'var(--surface-1)',
                border: '0.5px solid var(--border)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '8px',
                display: 'flex',
                gap: '12px',
                alignItems: 'center'
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 500 }}>{day.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                  {dayEntry ? (
                    <p style={{ margin: '0', fontSize: '12px', color: 'var(--text-secondary)' }}>{dayEntry.startTime} - {dayEntry.endTime} ({dayEntry.hours}h)</p>
                  ) : (
                    <p style={{ margin: '0', fontSize: '12px', color: 'var(--text-secondary)' }}>No entry</p>
                  )}
                </div>
                {!dayEntry && (
                  <QuickEntryForm onAdd={(start, end) => {
                    addTimeEntry(dateStr, start, end);
                  }} />
                )}
                {dayEntry && (
                  <button onClick={() => deleteTimeEntry(dayEntry.id)} style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    background: 'transparent',
                    border: '0.5px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    color: 'var(--text-secondary)'
                  }}>Delete</button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Manager view
  if (userRole === 'manager' && currentUser && selectedCompany) {
    const companyEmployees = employees.filter(e => e.companyId === selectedCompany);
    const companyName = companies.find(c => c.id === selectedCompany)?.name || 'LEVORO';

    // Get all pending paystubs
    const pendingPaystubs = [];
    companyEmployees.forEach(emp => {
      const periodStart = getPeriodStart(new Date(), emp.payPeriod);
      const paystubStatus = getPaystubStatus(emp.id, periodStart);
      if (!paystubStatus || paystubStatus.status === 'rejected') {
        const periodEntries = getPeriodHours(emp.id, periodStart, emp.payPeriod);
        if (periodEntries.length > 0) {
          pendingPaystubs.push({
            employee: emp,
            periodStart,
            entries: periodEntries,
            totalHours: periodEntries.reduce((sum, ts) => sum + parseFloat(ts.hours), 0),
            grossPay: (periodEntries.reduce((sum, ts) => sum + parseFloat(ts.hours), 0) * emp.hourlyRate).toFixed(2)
          });
        }
      }
    });

    const approvedPaystubs = [];
    companyEmployees.forEach(emp => {
      const periodStart = getPeriodStart(new Date(), emp.payPeriod);
      const paystubStatus = getPaystubStatus(emp.id, periodStart);
      if (paystubStatus && paystubStatus.status === 'approved') {
        approvedPaystubs.push({
          employee: emp,
          paystub: paystubStatus
        });
      }
    });

    return (
      <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 500 }}>{companyName} - Manager</h1>
          <button onClick={() => { setCurrentUser(null); setUserRole(null); setSelectedCompany(null); }} style={{
            padding: '8px 16px',
            fontSize: '13px',
            background: 'var(--surface-1)',
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)'
          }}>Logout</button>
        </div>

        {pendingPaystubs.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ background: 'var(--surface-1)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <h2 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 500 }}>⏳ Pending Manager Approval</h2>
              <p style={{ margin: '0', fontSize: '13px', color: 'var(--text-secondary)' }}>{pendingPaystubs.length} paystub(s) waiting for your approval</p>
            </div>

            {pendingPaystubs.map((item, idx) => (
              <div key={idx} style={{
                background: 'var(--surface-1)',
                border: '0.5px solid var(--border)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '12px'
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 500 }}>{item.employee.name}</p>
                    <p style={{ margin: '0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {item.periodStart.toLocaleDateString()} • {item.entries.length} day(s) • {item.totalHours.toFixed(2)}h
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>Gross Pay</p>
                    <p style={{ margin: '0', fontSize: '18px', fontWeight: 500 }}>${item.grossPay}</p>
                  </div>
                </div>

                <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: '12px', marginBottom: '12px' }}>
                  {item.entries.map(entry => (
                    <div key={entry.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', fontSize: '12px', padding: '6px 0', borderBottom: '0.5px solid var(--border)' }}>
                      <span>{new Date(entry.date).toLocaleDateString()}</span>
                      <span>{entry.startTime} - {entry.endTime} ({entry.hours}h)</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => approvePaystub(item.employee.id, item.periodStart)} style={{
                    flex: 1,
                    padding: '10px',
                    fontSize: '13px',
                    background: '#1d9e75',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 500
                  }}>✓ Approve for Paystub</button>
                  <button onClick={() => rejectPaystub(item.employee.id, item.periodStart)} style={{
                    padding: '10px 16px',
                    fontSize: '13px',
                    background: '#e24b4a',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 500
                  }}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {approvedPaystubs.length > 0 && (
          <div>
            <div style={{ background: 'var(--surface-1)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <h2 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 500 }}>✓ Approved & Ready</h2>
              <p style={{ margin: '0', fontSize: '13px', color: 'var(--text-secondary)' }}>{approvedPaystubs.length} paystub(s) ready for issuance</p>
            </div>

            {approvedPaystubs.map((item, idx) => (
              <div key={idx} style={{
                background: 'var(--surface-1)',
                border: '0.5px solid var(--border)',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '12px',
                opacity: 0.7
              }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px' }}>
                  <div>
                    <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 500 }}>{item.employee.name}</p>
                    <p style={{ margin: '0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Approved by you on {new Date(item.paystub.approvedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: '0', fontSize: '18px', fontWeight: 500 }}>${item.paystub.grossPay}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {pendingPaystubs.length === 0 && approvedPaystubs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
            No paystubs to review this period.
          </div>
        )}
      </div>
    );
  }

  // Admin view
  if (userRole === 'admin') {
    const selectedComp = companies.find(c => c.id === selectedCompany);
    const companyEmps = selectedCompany ? employees.filter(e => e.companyId === selectedCompany) : [];
    const approvedPaystubsCount = selectedCompany ? paystubs.filter(p => p.status === 'approved').length : 0;

    return (
      <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 500 }}>LEVORO - Admin</h1>
          <button onClick={() => { setCurrentUser(null); setUserRole(null); setSelectedCompany(null); }} style={{
            padding: '8px 16px',
            fontSize: '13px',
            background: 'var(--surface-1)',
            border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)'
          }}>Logout</button>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: 500 }}>Your Companies ({companies.length}/12)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            {companies.map(comp => (
              <div key={comp.id} style={{
                background: selectedCompany === comp.id ? 'var(--bg-accent)' : 'var(--surface-1)',
                border: '0.5px solid var(--border)',
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }} onClick={() => setSelectedCompany(comp.id)}>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 500, color: selectedCompany === comp.id ? 'var(--text-accent)' : 'var(--text-primary)' }}>{comp.name}</p>
                <p style={{ margin: '0', fontSize: '12px', color: selectedCompany === comp.id ? 'var(--text-accent)' : 'var(--text-secondary)' }}>
                  {employees.filter(e => e.companyId === comp.id).length} employees
                </p>
                <button onClick={(e) => { e.stopPropagation(); deleteCompany(comp.id); }} style={{
                  marginTop: '8px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  background: 'transparent',
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)'
                }}>Delete</button>
              </div>
            ))}
          </div>

          <button onClick={() => setShowAddCompany(!showAddCompany)} style={{
            padding: '8px 16px',
            fontSize: '13px',
            background: 'var(--fill-accent)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)'
          }}>+ Add Company</button>

          {showAddCompany && (
            <form onSubmit={handleAddCompany} style={{
              background: 'var(--surface-1)',
              border: '0.5px solid var(--border)',
              borderRadius: '12px',
              padding: '16px',
              marginTop: '16px',
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: '12px'
            }}>
              <input
                type="text"
                placeholder="Company name"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                style={{
                  padding: '8px 12px',
                  fontSize: '13px',
                  border: '0.5px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  fontFamily: 'var(--font-sans)'
                }}
              />
              <button type="submit" style={{
                padding: '8px 16px',
                fontSize: '13px',
                background: 'var(--fill-accent)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)'
              }}>Add</button>
            </form>
          )}
        </div>

        {selectedCompany && selectedComp && (
          <div>
            <div style={{ background: 'var(--surface-1)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 500 }}>{selectedComp.name}</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: '8px' }}>
                  <p style={{ margin: '0', fontSize: '12px', color: 'var(--text-secondary)' }}>Total Employees</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 500 }}>{companyEmps.length}</p>
                </div>
                <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: '8px' }}>
                  <p style={{ margin: '0', fontSize: '12px', color: 'var(--text-secondary)' }}>Approved Paystubs</p>
                  <p style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: 500 }}>{approvedPaystubsCount}</p>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 500 }}>Employees</h2>
                <button onClick={() => setShowAddEmployee(!showAddEmployee)} style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  background: 'var(--fill-accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)'
                }}>+ Add Employee</button>
              </div>

              {showAddEmployee && (
                <form onSubmit={handleAddEmployee} style={{
                  background: 'var(--surface-1)',
                  border: '0.5px solid var(--border)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '16px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '12px'
                }}>
                  <input
                    type="text"
                    placeholder="Employee name"
                    value={newEmployeeName}
                    onChange={(e) => setNewEmployeeName(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      fontSize: '13px',
                      border: '0.5px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      fontFamily: 'var(--font-sans)'
                    }}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newEmployeeEmail}
                    onChange={(e) => setNewEmployeeEmail(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      fontSize: '13px',
                      border: '0.5px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      fontFamily: 'var(--font-sans)'
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Hourly rate"
                    step="0.01"
                    value={newEmployeeRate}
                    onChange={(e) => setNewEmployeeRate(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      fontSize: '13px',
                      border: '0.5px solid var(--border)',
                      borderRadius: 'var(--radius)',
                      fontFamily: 'var(--font-sans)'
                    }}
                  />
                  <select value={newEmployeePayPeriod} onChange={(e) => setNewEmployeePayPeriod(e.target.value)} style={{
                    padding: '8px 10px',
                    fontSize: '13px',
                    border: '0.5px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    fontFamily: 'var(--font-sans)',
                    backgroundColor: 'var(--surface-2)'
                  }}>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-Weekly</option>
                  </select>
                  <button type="submit" style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    background: 'var(--fill-accent)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-sans)'
                  }}>Add</button>
                </form>
              )}

              <div>
                {companyEmps.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No employees yet.</p>
                ) : (
                  companyEmps.map(emp => (
                    <div key={emp.id} style={{
                      background: 'var(--surface-1)',
                      border: '0.5px solid var(--border)',
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '8px',
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: '12px',
                      alignItems: 'center'
                    }}>
                      <div>
                        <p style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 500 }}>{emp.name}</p>
                        <p style={{ margin: '0', fontSize: '12px', color: 'var(--text-secondary)' }}>{emp.email} • ${emp.hourlyRate.toFixed(2)}/hr • {emp.payPeriod}</p>
                      </div>
                      <button onClick={() => setEmployees(employees.filter(e => e.id !== emp.id))} style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        background: 'transparent',
                        border: '0.5px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-sans)',
                        color: 'var(--text-secondary)'
                      }}>Delete</button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {approvedPaystubsCount > 0 && (
              <button onClick={exportPayroll} style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 500,
                background: 'var(--fill-accent)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius)',
                cursor: 'pointer',
                fontFamily: 'var(--font-sans)'
              }}>📥 Export Approved Paystubs (CSV)</button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Login screen
  return (
    <div style={{ padding: '40px 20px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-sans)' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <h1 style={{ textAlign: 'center', margin: '0 0 24px 0', fontSize: '32px', fontWeight: 500 }}>LEVORO</h1>
        <p style={{ textAlign: 'center', margin: '0 0 32px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>Payroll Time Tracking & Approval</p>

        <form onSubmit={handleLogin} style={{
          background: 'var(--surface-1)',
          border: '0.5px solid var(--border)',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Email</label>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontFamily: 'var(--font-sans)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px' }}>Password</label>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius)',
                fontFamily: 'var(--font-sans)',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button type="submit" style={{
            width: '100%',
            padding: '12px',
            fontSize: '14px',
            fontWeight: 500,
            background: 'var(--fill-accent)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius)',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            marginBottom: '16px'
          }}>Login</button>
        </form>

        <div style={{ marginTop: '24px', background: 'var(--surface-0)', border: '0.5px solid var(--border)', borderRadius: '12px', padding: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 500 }}>Demo:</p>
          <p style={{ margin: '0 0 4px 0' }}>Admin: admin@levoro.com / admin123</p>
          <p style={{ margin: '0' }}>Then add companies and employees</p>
        </div>
      </div>
    </div>
  );
};

function QuickEntryForm({ onAdd }) {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (start && end) {
      onAdd(start, end);
      setStart('');
      setEnd('');
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} style={{
        padding: '6px 12px',
        fontSize: '12px',
        background: 'var(--fill-accent)',
        color: 'white',
        border: 'none',
        borderRadius: 'var(--radius)',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        whiteSpace: 'nowrap'
      }}>+ Add</button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '6px' }}>
      <input
        type="time"
        value={start}
        onChange={(e) => setStart(e.target.value)}
        style={{
          padding: '4px 8px',
          fontSize: '12px',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius)',
          fontFamily: 'var(--font-sans)'
        }}
      />
      <input
        type="time"
        value={end}
        onChange={(e) => setEnd(e.target.value)}
        style={{
          padding: '4px 8px',
          fontSize: '12px',
          border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius)',
          fontFamily: 'var(--font-sans)'
        }}
      />
      <button type="submit" style={{
        padding: '4px 8px',
        fontSize: '12px',
        background: '#1d9e75',
        color: 'white',
        border: 'none',
        borderRadius: 'var(--radius)',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)'
      }}>Save</button>
    </form>
  );
}

export default LEVOROPayroll;
