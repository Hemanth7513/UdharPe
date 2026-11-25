import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Receipt, ArrowDownRight, ArrowUpRight, MessageCircle, Download, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import SkeletonLoader from '../components/SkeletonLoader';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function CustomerLedger() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [customer, setCustomer] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ledgerFilter, setLedgerFilter] = useState('all');

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState(null);

  // Edit Transaction State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editNote, setEditNote] = useState('');

  // Email state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const fetchLedger = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Customer Details
      const { data: custData, error: custError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .eq('business_id', user.id)
        .single();
        
      if (custError) throw custError;
      setCustomer(custData);

      // 2. Fetch Bills (Udhar given)
      const { data: billsData, error: billsError } = await supabase
        .from('bills')
        .select('id, amount, note, created_at, bill_no, remaining_amount, status')
        .eq('customer_id', id)
        .eq('business_id', user.id);
        
      if (billsError) throw billsError;

      // 3. Fetch Settlements (Payments received)
      let settlementsData = [];
      const { data: sData, error: sError } = await supabase
        .from('settlements')
        .select('id, amount_paid, note, created_at')
        .eq('customer_id', id)
        .eq('business_id', user.id);

      if (!sError) {
          settlementsData = sData;
      }

      // 4. Combine and Sort by Date (chronological first to compute running balance)
      const combined = [
        ...(billsData || []).map(b => ({ ...b, type: 'bill', amount: Number(b.amount) })),
        ...settlementsData.map(s => ({ ...s, type: 'payment', amount: Number(s.amount_paid) }))
      ];

      // Sort chronological (oldest to newest) to compute balance tally
      combined.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      let currentTally = 0;
      combined.forEach(t => {
        if (t.type === 'bill') {
          currentTally += t.amount;
        } else {
          currentTally = Math.max(0, currentTally - t.amount);
        }
        t.runningBalance = currentTally;
      });

      // Sort newest first for reverse chronological UI stream
      combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      setTransactions(combined);

    } catch (error) {
      console.error('Error fetching ledger:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!paymentAmount || isNaN(paymentAmount) || Number(paymentAmount) <= 0) {
      toast.error('Please enter a valid amount.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const numericAmount = Number(paymentAmount);

      if (selectedBillForPayment) {
        if (numericAmount > Number(selectedBillForPayment.remaining_amount)) {
            throw new Error('Payment amount cannot be greater than the remaining amount for this bill.');
        }
      } else {
        if (numericAmount > Number(customer.total_outstanding)) {
            throw new Error('Payment amount cannot be greater than the outstanding Udhar.');
        }
      }

      const { error: paymentError } = await supabase.rpc('record_payment', {
        p_customer_id: id,
        p_amount: numericAmount,
        p_note: paymentNote || null,
        p_bill_id: selectedBillForPayment?.id || null,
      });

      if (paymentError) throw paymentError;

      setIsPaymentModalOpen(false);
      setSelectedBillForPayment(null);
      setPaymentAmount('');
      setPaymentNote('');
      toast.success('Payment recorded successfully!');
      fetchLedger();

    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTransaction = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const table = editingTransaction.type === 'bill' ? 'bills' : 'settlements';
      const { error } = await supabase
        .from(table)
        .update({ note: editNote })
        .eq('id', editingTransaction.id);

      if (error) throw error;
      
      toast.success('Note updated successfully!');
      setIsEditModalOpen(false);
      setEditingTransaction(null);
      fetchLedger(); // Refresh
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWhatsAppRemind = () => {
    if (!customer.phone) {
      toast.error("Customer does not have a phone number saved.");
      return;
    }
    const message = `Namaste ${customer.name},\nThis is a friendly reminder regarding your outstanding balance of ₹${Number(customer.total_outstanding).toLocaleString('en-IN')} with our business. Kindly arrange for the settlement at your convenience. Thank you!`;
    const encodedMessage = encodeURIComponent(message);
    // Assumes Indian numbers if no country code, for a real app we'd format better
    let phoneStr = customer.phone.replace(/\D/g, '');
    if (phoneStr.length === 10) phoneStr = '91' + phoneStr;
    
    window.open(`https://wa.me/${phoneStr}?text=${encodedMessage}`, '_blank');
  };

  const generatePDF = (returnBase64 = false) => {
    if (!customer || transactions.length === 0) {
      if (!returnBase64) toast.error("No data to generate PDF.");
      return null;
    }
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.text("Khata Statement", 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Party / Customer Name: ${customer.name}`, 14, 30);
    if (customer.phone) doc.text(`Phone: ${customer.phone}`, 14, 37);
    doc.text(`Total Outstanding (Baki): Rs. ${Number(customer.total_outstanding).toLocaleString('en-IN')}`, 14, 44);
    
    // Table
    const tableColumn = ["Date", "Entry Type", "Remarks / Note", "Amount (Rs.)"];
    const tableRows = [];

    transactions.forEach(t => {
      const date = new Date(t.created_at).toLocaleDateString('en-IN');
      const type = t.type === 'bill' ? 'Udhar (Given)' : 'Jama (Received)';
      const amount = `Rs. ${t.amount.toLocaleString('en-IN')}`;
      tableRows.push([date, type, t.note || '-', amount]);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [79, 70, 229] } // neu-primary color
    });

    if (returnBase64) {
      // Return base64 string without data:application/pdf;base64, prefix for Resend
      const dataUri = doc.output('datauristring');
      return dataUri.split(',')[1];
    } else {
      doc.save(`${customer.name.replace(/\s+/g, '_')}_Statement.pdf`);
      toast.success("PDF Statement downloaded!");
    }
  };

  const handleExportExcel = () => {
    if (!customer || transactions.length === 0) {
      toast.error("No data to export.");
      return;
    }
    const headers = ['Date', 'Type', 'Note', 'Amount (INR)'];
    const rows = transactions.map(t => [
      new Date(t.created_at).toLocaleString(),
      t.type === 'bill' ? 'Udhar Given' : 'Payment Received',
      t.note || '-',
      t.amount
    ]);
    rows.push(['Total Outstanding', '', '', Number(customer.total_outstanding)]);
    const csvContent = '\uFEFF' + [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${customer.name.replace(/\s+/g, '_')}_Ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Ledger exported (.csv)!");
  };

  const sendEmailToBackend = async ({ subject, message, template, attachments = [] }) => {
    if (!customer?.email) {
      throw new Error('Customer does not have an email address on file');
    }

    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        customer_id: customer.id,
        subject,
        message,
        template,
        attachments,
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const handleSendSupportEmail = async (e) => {
    e.preventDefault();
    if (!emailSubject || !emailMessage) {
      toast.error("Please fill in both subject and message.");
      return;
    }
    if (!customer.email) {
      toast.error("Customer does not have an email address on file.");
      return;
    }

    setIsSendingEmail(true);
    try {
      await sendEmailToBackend({ subject: emailSubject, message: emailMessage });
      toast.success("Email sent successfully!");
      setIsEmailModalOpen(false);
      setEmailSubject('');
      setEmailMessage('');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleEmailStatement = async () => {
    if (!customer.email) {
      toast.error("Customer does not have an email address on file.");
      return;
    }

    setIsSendingEmail(true);
    const pdfBase64 = generatePDF(true);
    if (!pdfBase64) {
      setIsSendingEmail(false);
      return;
    }

    try {
      await sendEmailToBackend({
        subject: `Statement for ${customer.name}`,
        template: 'statement',
        attachments: [{
          filename: `${customer.name.replace(/\s+/g, '_')}_Statement.pdf`,
          content: pdfBase64
        }],
      });
      toast.success("Statement emailed successfully!");
    } catch (error) {
      toast.error("Failed to email statement: " + error.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <SkeletonLoader className="w-32 h-6 mb-6" />
        <SkeletonLoader className="w-full h-32 mb-8" />
        <SkeletonLoader className="w-48 h-8 mb-6" />
        <div className="space-y-4">
          <SkeletonLoader className="w-full h-24" count={3} />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-neu-heading">Customer not found</h2>
        <button onClick={() => navigate('/customers')} className="btn-primary mt-4 px-4 py-2 text-sm">Go Back</button>
      </div>
    );
  }

  return (
    <motion.div 
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in pb-24"
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    >
      <button 
        onClick={() => navigate('/customers')}
        className="mb-6 flex items-center gap-2 text-neu-text hover:text-neu-primary transition-colors font-bold text-sm"
      >
        <ArrowLeft size={16} /> Back to Parties
      </button>

      {/* Customer Header Card */}
      <div className="neu-card p-6 sm:p-8 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 shadow-neu-inner rounded-full flex items-center justify-center text-neu-primary bg-neu-bg shrink-0">
             <User size={30} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-neu-heading tracking-tight">{customer.name}</h1>
            {customer.phone && <p className="text-neu-text font-medium mt-1 text-sm">{customer.phone}</p>}
          </div>
        </div>
        
        <div className="text-left md:text-right w-full md:w-auto flex flex-col md:items-end gap-3">
          <div className="p-4 md:p-0 rounded-2xl md:rounded-none shadow-neu-inner md:shadow-none bg-neu-bg md:bg-transparent w-full md:w-auto">
            <p className="text-sm text-neu-text font-bold uppercase tracking-wider mb-1">Total Outstanding</p>
            <p className="text-4xl font-black text-neu-danger">₹{Number(customer.total_outstanding).toLocaleString()}</p>
          </div>
          
          {Number(customer.total_outstanding) > 0 && (
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <button 
                onClick={() => {
                  setSelectedBillForPayment(null);
                  setIsPaymentModalOpen(true);
                }}
                className="btn-solid flex-1 md:flex-none py-2 px-4 text-sm"
              >
                Record Payment
              </button>
              <button 
                onClick={handleWhatsAppRemind}
                className="neu-card flex items-center justify-center w-10 h-10 text-[#25D366] hover:scale-105 transition-transform shrink-0"
                title="Send WhatsApp Reminder"
              >
                <MessageCircle size={20} />
              </button>
              <button 
                onClick={handleEmailStatement}
                disabled={isSendingEmail}
                className="neu-card flex items-center justify-center w-10 h-10 text-neu-primary hover:scale-105 transition-transform shrink-0 disabled:opacity-50"
                title="Email PDF Statement"
              >
                <Mail size={20} />
              </button>
              <button 
                onClick={generatePDF}
                className="neu-card flex items-center justify-center w-10 h-10 text-neu-primary hover:scale-105 transition-transform shrink-0"
                title="Download PDF Statement"
              >
                <Download size={20} />
              </button>
              <button 
                onClick={handleExportExcel}
                className="neu-card flex items-center justify-center w-10 h-10 text-green-600 hover:scale-105 transition-transform shrink-0 font-bold"
                title="Download Excel"
              >
                XL
              </button>
              <button 
                onClick={() => setIsEmailModalOpen(true)}
                className="neu-card flex items-center justify-center py-2 px-4 text-neu-primary hover:text-white hover:bg-neu-primary transition-all font-bold text-sm shrink-0"
              >
                Support Email
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pl-1">
        <h2 className="text-xl font-bold text-neu-heading">Transaction History</h2>
        <div className="flex items-center gap-1.5 p-1 bg-[#f0e9db] rounded-lg border border-[#d6cbb9] self-start sm:self-auto">
          {[
            { id: 'all', label: 'All Entries' },
            { id: 'bill', label: 'Udhar Bills' },
            { id: 'settlement', label: 'Payments' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setLedgerFilter(tab.id)}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                ledgerFilter === tab.id
                  ? 'bg-[#fffdf9] text-red-800 shadow-sm border border-[#c7bba7]'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {transactions.filter(t => ledgerFilter === 'all' || t.type === ledgerFilter).length === 0 ? (
           <div className="neu-card p-10 text-center">
             <p className="text-neu-text font-medium">No transactions matching this filter.</p>
           </div>
        ) : (
          transactions
            .filter(t => ledgerFilter === 'all' || t.type === ledgerFilter)
            .map(t => (
            <div key={t.id} className="neu-card p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-neu-hover transition-all">
              <div className="flex items-center gap-4">
                {t.type === 'bill' ? (
                  <div className="w-12 h-12 rounded-md border border-red-200 bg-red-50/60 flex items-center justify-center text-red-800 shrink-0">
                    <ArrowUpRight size={22} />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-md border border-emerald-200 bg-emerald-50/60 flex items-center justify-center text-emerald-700 shrink-0">
                    <ArrowDownRight size={22} />
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-neu-heading text-lg flex items-center gap-2.5 flex-wrap">
                    {t.type === 'bill' ? (t.bill_no || 'Udhar Given') : 'Payment Received'}
                    {t.type === 'bill' && t.status === 'paid' && (
                      <span className="stamp-paid">PAID</span>
                    )}
                    {t.type === 'bill' && t.status === 'partial' && (
                      <span className="stamp-partial">PARTIAL</span>
                    )}
                    {t.type === 'bill' && t.status === 'pending' && (
                      <span className="stamp-due">DUE</span>
                    )}
                    {t.type === 'settlement' && (
                      <span className="stamp-paid">SETTLED</span>
                    )}
                  </h4>
                  <p className="text-sm text-neu-text font-medium mt-0.5">
                    {new Date(t.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                  {t.note && (
                    <p className="text-sm text-neu-text/80 mt-2 bg-neu-bg/50 inline-block px-3 py-1 rounded-lg italic border border-white/20">
                      "{t.note}"
                    </p>
                  )}
                  {t.type === 'bill' && t.remaining_amount > 0 && (
                    <p className="text-sm text-neu-danger font-bold mt-2">
                      Remaining: ₹{Number(t.remaining_amount).toLocaleString()}
                    </p>
                  )}
                  
                  <button 
                    onClick={() => {
                      setEditingTransaction(t);
                      setEditNote(t.note || '');
                      setIsEditModalOpen(true);
                    }}
                    className="mt-3 text-xs font-bold text-neu-text/60 hover:text-neu-primary transition-colors block"
                  >
                    Edit Note
                  </button>
                </div>
              </div>
              <div className="text-right w-full sm:w-auto mt-2 sm:mt-0 pt-4 sm:pt-0 border-t border-white/20 sm:border-t-0 flex flex-col items-end">
                <p className={`font-black text-2xl ${t.type === 'bill' ? 'text-neu-danger' : 'text-neu-success'}`}>
                  {t.type === 'bill' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                </p>
                {t.runningBalance !== undefined && (
                  <p className="text-xs font-mono font-semibold text-slate-500 mt-1">
                    Balance: ₹{t.runningBalance.toLocaleString('en-IN')}
                  </p>
                )}
                {t.type === 'bill' && t.remaining_amount > 0 && (
                  <button 
                    onClick={() => {
                      setSelectedBillForPayment(t);
                      setIsPaymentModalOpen(true);
                    }}
                    className="mt-2 text-xs font-bold text-neu-primary hover:text-neu-primary-hover border border-neu-primary px-3 py-1 rounded-lg transition-colors"
                  >
                    Apply Payment
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Floating Action Button for raising a bill pre-filled with this customer */}
      <button 
        onClick={() => navigate(`/billing?customer_id=${customer.id}`)}
        className="fixed bottom-24 md:bottom-8 right-6 w-14 h-14 bg-neu-primary text-white rounded-full shadow-[0_10px_20px_rgba(79,70,229,0.4)] flex items-center justify-center hover:scale-105 hover:bg-neu-primary-hover transition-all z-40"
        title="Raise Udhar for this customer"
      >
        <Receipt size={24} />
      </button>

      {/* Record Payment Modal */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => { setIsPaymentModalOpen(false); setSelectedBillForPayment(null); }} title={selectedBillForPayment ? `Record Payment for ${selectedBillForPayment.bill_no || 'Bill'}` : "Record Payment"}>
        <form onSubmit={handleRecordPayment} className="space-y-5">
          {selectedBillForPayment && (
            <div className="bg-neu-primary/10 border border-neu-primary/20 rounded-xl p-4 mb-4 text-sm font-bold text-neu-primary">
              Remaining Balance for this Bill: ₹{Number(selectedBillForPayment.remaining_amount).toLocaleString()}
            </div>
          )}
          <div>
            <label htmlFor="paymentAmount" className="block text-sm font-bold text-neu-heading mb-2 pl-1 uppercase tracking-wide">
              Amount Paid (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-neu-heading font-black text-xl">₹</span>
              <input 
                id="paymentAmount"
                type="number" required min="1" step="0.01"
                value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                placeholder="0.00" 
                className="w-full bg-neu-bg text-neu-heading rounded-2xl pl-12 pr-4 py-4 outline-none focus:ring-2 focus:ring-neu-primary/30 shadow-neu-inner font-black text-xl"
              />
            </div>
            {/* Quick Amount Suggestion Chips */}
            {(() => {
              const maxPayable = selectedBillForPayment ? Number(selectedBillForPayment.remaining_amount) : Number(customer?.total_outstanding || 0);
              if (maxPayable <= 0) return null;
              return (
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(String(maxPayable))}
                    className="px-3 py-1 rounded-full text-xs font-bold bg-neu-primary/10 text-neu-primary border border-neu-primary/30 hover:bg-neu-primary hover:text-white transition-colors"
                  >
                    Full Balance (₹{maxPayable.toLocaleString('en-IN')})
                  </button>
                  {maxPayable > 100 && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(String(Math.round(maxPayable / 2)))}
                      className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      50% (₹{Math.round(maxPayable / 2).toLocaleString('en-IN')})
                    </button>
                  )}
                  {[500, 1000, 2000, 5000].filter(amt => amt < maxPayable).map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setPaymentAmount(String(amt))}
                      className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      +₹{amt.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
          <div>
            <label htmlFor="paymentNote" className="block text-sm font-bold text-neu-heading mb-2 pl-1 uppercase tracking-wide">
              Note (Optional)
            </label>
            <input 
              id="paymentNote"
              type="text" value={paymentNote} onChange={e => setPaymentNote(e.target.value)}
              placeholder="e.g. Cash, UPI, etc." className="input-field"
            />
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-solid w-full mt-6 py-4">
            {isSubmitting ? 'Processing...' : 'Save Payment'}
          </button>
        </form>
      </Modal>

      {/* Edit Transaction Note Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Note">
        <form onSubmit={handleEditTransaction} className="space-y-5">
          <div>
            <label htmlFor="editNote" className="block text-sm font-bold text-neu-heading mb-2 pl-1 uppercase tracking-wide">
              Transaction Note
            </label>
            <input 
              id="editNote"
              type="text" value={editNote} onChange={e => setEditNote(e.target.value)}
              placeholder="e.g. Cash, UPI, etc." className="input-field"
            />
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-solid w-full mt-4">
            {isSubmitting ? 'Updating...' : 'Update Note'}
          </button>
        </form>
      </Modal>

      {/* Support Email Modal */}
      <Modal isOpen={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)} title="Send Email to Customer">
        <form onSubmit={handleSendSupportEmail} className="space-y-5">
          <div>
            <label htmlFor="emailSubject" className="block text-sm font-bold text-neu-heading mb-2 pl-1 uppercase tracking-wide">
              Subject
            </label>
            <input
              id="emailSubject"
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="input-field"
              placeholder="e.g. Question about your recent bill"
              required
            />
          </div>
          <div>
            <label htmlFor="emailMessage" className="block text-sm font-bold text-neu-heading mb-2 pl-1 uppercase tracking-wide">
              Message
            </label>
            <textarea
              id="emailMessage"
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              className="input-field min-h-[150px] resize-y"
              placeholder="Type your message here..."
              required
            />
          </div>
          <button 
            type="submit" 
            className="btn-solid w-full mt-4 flex items-center justify-center gap-2"
            disabled={isSendingEmail}
          >
            {isSendingEmail ? 'Sending...' : 'Send Email'} <Mail size={18} />
          </button>
        </form>
      </Modal>
    </motion.div>
  );
}
