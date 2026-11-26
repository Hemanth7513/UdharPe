import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { motion } from 'framer-motion';
import { ArrowLeft, User, Receipt, ArrowDownRight, ArrowUpRight, MessageCircle, Download, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import SkeletonLoader from '../components/SkeletonLoader';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { exportCsv } from '../lib/csv';
import { getIntlLocale } from '../i18n';

export default function CustomerLedger() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const intlLocale = getIntlLocale(i18n.language);
  
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
    toast('WhatsApp Reminders are coming in our Subscription plan — we are working on it!', {
      icon: '✨',
    });
    navigate('/subscription');
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
      headStyles: { fillColor: [24, 24, 27] }
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
    exportCsv(`${customer.name.replace(/\s+/g, '_')}_Ledger.csv`, headers, rows);
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

  const handleEmailReminder = async () => {
    if (!customer.email) {
      toast.error('Customer does not have an email address saved.');
      return;
    }

    setIsSendingEmail(true);
    try {
      await sendEmailToBackend({
        subject: `Payment Reminder: ₹${Number(customer.total_outstanding).toLocaleString('en-IN')} Outstanding`,
        template: 'reminder',
      });
      toast.success(`Payment reminder emailed to ${customer.email}!`);
    } catch (error) {
      toast.error('Failed to send reminder: ' + error.message);
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
      className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-24"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <button
        onClick={() => navigate('/customers')}
        className="mb-5 flex items-center gap-2 text-zinc-600 hover:text-zinc-900 transition-colors duration-150 font-semibold text-[14px]"
      >
        <ArrowLeft size={16} /> {t('ledger.backToCustomers')}
      </button>

      {/* Customer Header Card */}
      <div className="bg-white border border-zinc-300 rounded-lg p-6 sm:p-7 mb-7 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-900 shrink-0">
            <User size={26} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-zinc-900 tracking-tight">{customer.name}</h1>
            {customer.phone && <p className="text-zinc-600 mt-0.5 text-[14px] tabular-nums">{customer.phone}</p>}
          </div>
        </div>

        <div className="text-left md:text-right w-full md:w-auto flex flex-col md:items-end gap-3">
          <div>
            <p className="text-[13px] text-zinc-500 font-medium mb-0.5">{t('ledger.totalOutstanding')}</p>
            <p className={`text-3xl sm:text-4xl font-display font-bold tabular-nums ${Number(customer.total_outstanding) > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
              ₹{Number(customer.total_outstanding).toLocaleString('en-IN')}
            </p>
          </div>

          {Number(customer.total_outstanding) > 0 && (
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <button
                onClick={() => {
                  setSelectedBillForPayment(null);
                  setIsPaymentModalOpen(true);
                }}
                className="btn-primary flex-1 md:flex-none py-2 px-4 text-[14px]"
              >
                {t('ledger.recordPayment')}
              </button>
              <button
                onClick={handleEmailReminder}
                disabled={isSendingEmail}
                className="btn-solid py-2 px-3.5 text-[14px] shrink-0 disabled:opacity-50"
                title={customer.email ? `${t('ledger.emailReminder')}: ${customer.email}` : t('ledger.noEmailError')}
              >
                <Mail size={16} /> {isSendingEmail ? t('settings.saving') : t('ledger.emailReminder')}
              </button>
              <button
                onClick={handleWhatsAppRemind}
                className="btn-solid px-3 h-10 text-zinc-700 shrink-0 text-[13px]"
                title="WhatsApp Reminder (Subscription — Coming Soon)"
              >
                <MessageCircle size={16} className="text-zinc-500" />
                <span className="hidden sm:inline text-[11px] font-semibold bg-zinc-100 border border-zinc-200 rounded px-1.5 py-0.5 text-zinc-600">
                  Subscription
                </span>
              </button>
              <button
                onClick={handleEmailStatement}
                disabled={isSendingEmail}
                className="btn-solid w-10 h-10 p-0 shrink-0 disabled:opacity-50"
                title={t('ledger.emailStatement')}
              >
                <Mail size={18} />
              </button>
              <button
                onClick={generatePDF}
                className="btn-solid w-10 h-10 p-0 shrink-0"
                title={t('ledger.downloadPdf')}
              >
                <Download size={18} />
              </button>
              <button
                onClick={handleExportExcel}
                className="btn-solid w-10 h-10 p-0 text-emerald-700 shrink-0 font-bold text-[13px]"
                title={t('ledger.exportExcel')}
              >
                CSV
              </button>
              <button
                onClick={() => setIsEmailModalOpen(true)}
                className="btn-solid py-2 px-3.5 text-[14px] shrink-0"
              >
                Support Email
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <h2 className="text-xl font-display font-bold text-zinc-900">{t('dashboard.recentTransactions')}</h2>
        <div className="flex items-center gap-1 p-1 bg-zinc-200/70 rounded-md border border-zinc-300 self-start sm:self-auto">
          {[
            { id: 'all', label: t('ledger.filterAll') },
            { id: 'bill', label: t('ledger.filterBills') },
            { id: 'settlement', label: t('ledger.filterPayments') },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setLedgerFilter(tab.id)}
              className={`relative px-3 py-1 rounded text-[13px] font-semibold transition-colors duration-150 ${
                ledgerFilter === tab.id
                  ? 'text-zinc-900'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {ledgerFilter === tab.id && (
                <motion.span
                  layoutId="ledgerFilterPill"
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 bg-white rounded shadow-neu"
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-zinc-300 rounded-lg divide-y divide-zinc-200" style={{ perspective: '900px' }}>
        {transactions.filter(tx => ledgerFilter === 'all' || tx.type === ledgerFilter).length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-zinc-600 font-medium text-[15px]">{t('ledger.noEntries')}</p>
          </div>
        ) : (
          transactions
            .filter(tx => ledgerFilter === 'all' || tx.type === ledgerFilter)
            .map((tx, idx) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, rotateX: -6, y: 6 }}
              animate={{ opacity: 1, rotateX: 0, y: 0 }}
              transition={{ delay: Math.min(idx * 0.03, 0.24), duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-zinc-50/70 transition-colors duration-150"
            >
              <div className="flex items-start gap-4">
                {tx.type === 'bill' ? (
                  <div className="w-10 h-10 rounded-md border border-red-200 bg-red-50 flex items-center justify-center text-red-600 shrink-0 mt-0.5">
                    <ArrowUpRight size={20} />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-md border border-emerald-200 bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
                    <ArrowDownRight size={20} />
                  </div>
                )}
                <div>
                  <h4 className="font-display font-bold text-zinc-900 text-[16px] flex items-center gap-2.5 flex-wrap">
                    <span>{tx.type === 'bill' ? (tx.bill_no || t('dashboard.udharGiven')) : t('dashboard.jamaReceived')}</span>
                    {tx.type === 'bill' && tx.status === 'paid' && (
                      <span className="text-[13px] font-semibold text-emerald-700">· {t('common.paid')}</span>
                    )}
                    {tx.type === 'bill' && tx.status === 'partial' && (
                      <span className="text-[13px] font-semibold text-amber-700">· {t('common.partial')}</span>
                    )}
                    {tx.type === 'bill' && tx.status === 'pending' && (
                      <span className="text-[13px] font-semibold text-red-600">· {t('common.pending')}</span>
                    )}
                  </h4>
                  <p className="text-[13px] text-zinc-500 mt-0.5">
                    {new Date(tx.created_at).toLocaleString(intlLocale, { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                  {tx.note && (
                    <p className="text-[14px] text-zinc-700 mt-1.5 italic">
                      "{tx.note}"
                    </p>
                  )}
                  {tx.type === 'bill' && tx.remaining_amount > 0 && (
                    <p className="text-[13px] text-red-600 font-semibold mt-1.5 tabular-nums">
                      {t('ledger.balanceDue')}: ₹{Number(tx.remaining_amount).toLocaleString('en-IN')}
                    </p>
                  )}

                  <button
                    onClick={() => {
                      setEditingTransaction(tx);
                      setEditNote(tx.note || '');
                      setIsEditModalOpen(true);
                    }}
                    className="mt-2 text-[13px] font-semibold text-zinc-500 hover:text-zinc-900 transition-colors duration-150 block"
                  >
                    {t('ledger.editNote')}
                  </button>
                </div>
              </div>
              <div className="text-left sm:text-right w-full sm:w-auto flex flex-row sm:flex-col justify-between sm:items-end items-center">
                <div>
                  <p className={`font-display font-bold text-xl tabular-nums ${tx.type === 'bill' ? 'text-red-600' : 'text-emerald-700'}`}>
                    {tx.type === 'bill' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                  </p>
                  {tx.runningBalance !== undefined && (
                    <p className="text-[13px] font-medium text-zinc-500 mt-0.5 tabular-nums">
                      {t('billing.currentBalance')}: ₹{tx.runningBalance.toLocaleString('en-IN')}
                    </p>
                  )}
                </div>
                {tx.type === 'bill' && tx.remaining_amount > 0 && (
                  <button
                    onClick={() => {
                      setSelectedBillForPayment(tx);
                      setIsPaymentModalOpen(true);
                    }}
                    className="mt-0 sm:mt-2 btn-solid py-1.5 px-3 text-[13px]"
                  >
                    {t('ledger.applyPayment')}
                  </button>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Floating Action Button (Charcoal, not Red) */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate(`/billing?customer_id=${customer.id}`)}
        className="fixed bottom-24 md:bottom-8 right-6 w-14 h-14 bg-zinc-900 text-white rounded-full shadow-elevated flex items-center justify-center hover:bg-zinc-800 transition-colors duration-150 z-40"
        title="Raise Udhar for this customer"
      >
        <Receipt size={22} />
      </motion.button>

      {/* Record Payment Modal */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => { setIsPaymentModalOpen(false); setSelectedBillForPayment(null); }} title={selectedBillForPayment ? `${t('ledger.paymentModalTitle')} (${selectedBillForPayment.bill_no || ''})` : t('ledger.paymentModalTitle')}>
        <form onSubmit={handleRecordPayment} className="space-y-5">
          {selectedBillForPayment && (
            <div className="bg-neu-primary/10 border border-neu-primary/20 rounded-xl p-4 mb-4 text-sm font-bold text-neu-primary">
              {t('ledger.balanceDue')}: ₹{Number(selectedBillForPayment.remaining_amount).toLocaleString('en-IN')}
            </div>
          )}
          <div>
            <label htmlFor="paymentAmount" className="block text-sm font-bold text-neu-heading mb-2 pl-1 uppercase tracking-wide">
              {t('ledger.amountReceived')} *
            </label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-neu-heading font-black text-xl">₹</span>
              <input 
                id="paymentAmount"
                type="number" required min="1" step="0.01"
                value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                placeholder="0.00" 
                className="input-field pl-10 py-3 font-display font-bold text-lg tabular-nums"
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
                    {t('ledger.fullBalance')} (₹{maxPayable.toLocaleString('en-IN')})
                  </button>
                  {maxPayable > 100 && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(String(Math.round(maxPayable / 2)))}
                      className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      {t('ledger.halfBalance')} (₹{Math.round(maxPayable / 2).toLocaleString('en-IN')})
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
