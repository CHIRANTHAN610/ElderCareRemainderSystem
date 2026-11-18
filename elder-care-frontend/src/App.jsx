import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Calendar,
  Clock,
  Edit3,
  Eye,
  HeartPulse,
  Hospital,
  MapPin,
  Phone,
  Pill,
  Plus,
  RefreshCw,
  Search,
  Stethoscope,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import { appointmentsApi, eldersApi, medicinesApi } from './api';

function formatTime12h(timeStr) {
  if (!timeStr) return '—';
  const [hStr, mStr] = timeStr.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return timeStr;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

function toInputTime(timeStr) {
  if (!timeStr) return '';
  return timeStr.slice(0, 5);
}

function isDueSoon(timeStr) {
  if (!timeStr) return false;
  const [h, m] = timeStr.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);
  const diffMin = (target - now) / 60000;
  return diffMin >= -15 && diffMin <= 60;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [elders, setElders] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedElderId, setSelectedElderId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);

  // Modals
  const [elderModalOpen, setElderModalOpen] = useState(false);
  const [medicineModalOpen, setMedicineModalOpen] = useState(false);
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [detailModal, setDetailModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [elderForm, setElderForm] = useState({ name: '', age: '', phone: '', address: '' });
  const [medicineForm, setMedicineForm] = useState({
    medicineName: '',
    dosage: '',
    reminderTime: '08:00',
    frequency: 'Once daily',
    elderId: '',
  });
  const [appointmentForm, setAppointmentForm] = useState({
    doctorName: '',
    hospitalName: '',
    appointmentDate: '',
    appointmentTime: '10:00',
    description: '',
    elderId: '',
  });

  function showToast(message, type = 'success') {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev && prev.message === message ? null : prev));
    }, 3500);
  }

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [eldersData, appointmentsData, medicinesData] = await Promise.all([
        eldersApi.getAll(),
        appointmentsApi.getAll(),
        medicinesApi.getAll(),
      ]);
      setElders(eldersData || []);
      setAppointments(appointmentsData || []);
      setMedicines(medicinesData || []);
    } catch (err) {
      setError(
        err.message ||
          'Could not connect to the Spring Boot backend at http://localhost:8080.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filteredElders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return elders.filter((e) => {
      if (selectedElderId !== 'all' && String(e.id) !== selectedElderId) return false;
      if (!q) return true;
      return (
        (e.name || '').toLowerCase().includes(q) ||
        (e.phone || '').toLowerCase().includes(q) ||
        (e.address || '').toLowerCase().includes(q)
      );
    });
  }, [elders, selectedElderId, searchQuery]);

  const filteredMedicines = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return medicines
      .filter((m) => {
        if (selectedElderId !== 'all' && String(m.elder?.id) !== selectedElderId) {
          return false;
        }
        if (!q) return true;
        return (
          (m.medicineName || '').toLowerCase().includes(q) ||
          (m.dosage || '').toLowerCase().includes(q) ||
          (m.frequency || '').toLowerCase().includes(q) ||
          (m.elder?.name || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.reminderTime || '').localeCompare(b.reminderTime || ''));
  }, [medicines, selectedElderId, searchQuery]);

  const filteredAppointments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return appointments
      .filter((a) => {
        if (selectedElderId !== 'all' && String(a.elder?.id) !== selectedElderId) {
          return false;
        }
        if (!q) return true;
        return (
          (a.doctorName || '').toLowerCase().includes(q) ||
          (a.hospitalName || '').toLowerCase().includes(q) ||
          (a.description || '').toLowerCase().includes(q) ||
          (a.elder?.name || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const d = (a.appointmentDate || '').localeCompare(b.appointmentDate || '');
        if (d !== 0) return d;
        return (a.appointmentTime || '').localeCompare(b.appointmentTime || '');
      });
  }, [appointments, selectedElderId, searchQuery]);

  const dueSoonMedicines = useMemo(
    () => filteredMedicines.filter((m) => isDueSoon(m.reminderTime)),
    [filteredMedicines]
  );

  // Handlers
  async function handleAddElder(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await eldersApi.create({
        name: elderForm.name.trim(),
        age: Number(elderForm.age),
        phone: elderForm.phone.trim(),
        address: elderForm.address.trim(),
      });
      setElders((prev) => [...prev, created]);
      setElderForm({ name: '', age: '', phone: '', address: '' });
      setElderModalOpen(false);
      showToast(`Added ${created.name}`);
    } catch (err) {
      showToast(err.message || 'Failed to add elder', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddMedicine(e) {
    e.preventDefault();
    if (!medicineForm.elderId) {
      showToast('Please select an elder', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        medicineName: medicineForm.medicineName.trim(),
        dosage: medicineForm.dosage.trim(),
        reminderTime: medicineForm.reminderTime,
        frequency: medicineForm.frequency.trim(),
        elder: { id: Number(medicineForm.elderId) },
      };
      await medicinesApi.create(payload);
      await loadAll();
      setMedicineForm({
        medicineName: '',
        dosage: '',
        reminderTime: '08:00',
        frequency: 'Once daily',
        elderId: elders[0]?.id ? String(elders[0].id) : '',
      });
      setMedicineModalOpen(false);
      showToast('Medicine reminder added');
    } catch (err) {
      showToast(err.message || 'Failed to add medicine', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function openNewAppointmentModal() {
    setEditingAppointment(null);
    setAppointmentForm({
      doctorName: '',
      hospitalName: '',
      appointmentDate: new Date().toISOString().slice(0, 10),
      appointmentTime: '10:00',
      description: '',
      elderId:
        selectedElderId !== 'all'
          ? selectedElderId
          : elders[0]?.id
          ? String(elders[0].id)
          : '',
    });
    setAppointmentModalOpen(true);
  }

  function openEditAppointmentModal(appt) {
    setEditingAppointment(appt);
    setAppointmentForm({
      doctorName: appt.doctorName || '',
      hospitalName: appt.hospitalName || '',
      appointmentDate: appt.appointmentDate || '',
      appointmentTime: toInputTime(appt.appointmentTime),
      description: appt.description || '',
      elderId: appt.elder?.id ? String(appt.elder.id) : '',
    });
    setAppointmentModalOpen(true);
  }

  async function handleSaveAppointment(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingAppointment) {
        const updated = await appointmentsApi.update(editingAppointment.id, {
          doctorName: appointmentForm.doctorName.trim(),
          hospitalName: appointmentForm.hospitalName.trim(),
          appointmentDate: appointmentForm.appointmentDate,
          appointmentTime: appointmentForm.appointmentTime,
          description: appointmentForm.description.trim(),
        });
        setAppointments((prev) =>
          prev.map((a) => (a.id === updated.id ? updated : a))
        );
        showToast('Appointment updated');
      } else {
        if (!appointmentForm.elderId) {
          showToast('Please select an elder', 'error');
          setSubmitting(false);
          return;
        }
        await appointmentsApi.create({
          doctorName: appointmentForm.doctorName.trim(),
          hospitalName: appointmentForm.hospitalName.trim(),
          appointmentDate: appointmentForm.appointmentDate,
          appointmentTime: appointmentForm.appointmentTime,
          description: appointmentForm.description.trim(),
          elder: { id: Number(appointmentForm.elderId) },
        });
        await loadAll();
        showToast('Appointment scheduled');
      }
      setAppointmentModalOpen(false);
    } catch (err) {
      showToast(err.message || 'Failed to save appointment', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleViewDetail(type, id) {
    try {
      let data;
      if (type === 'elder') data = await eldersApi.getById(id);
      if (type === 'medicine') data = await medicinesApi.getById(id);
      if (type === 'appointment') data = await appointmentsApi.getById(id);
      setDetailModal({ type, data });
    } catch (err) {
      showToast(err.message || 'Could not load details', 'error');
    }
  }

  async function executeDelete() {
    if (!confirmDelete) return;
    setSubmitting(true);
    try {
      const { type, item } = confirmDelete;
      let msg = '';
      if (type === 'elder') {
        msg = await eldersApi.delete(item.id);
        setElders((prev) => prev.filter((e) => e.id !== item.id));
        if (selectedElderId === String(item.id)) setSelectedElderId('all');
      } else if (type === 'medicine') {
        msg = await medicinesApi.delete(item.id);
        setMedicines((prev) => prev.filter((m) => m.id !== item.id));
      } else if (type === 'appointment') {
        msg = await appointmentsApi.delete(item.id);
        setAppointments((prev) => prev.filter((a) => a.id !== item.id));
      }
      showToast(msg || 'Deleted successfully');
      setConfirmDelete(null);
    } catch (err) {
      showToast(
        err.message ||
          'Delete failed. Make sure no linked reminders block removing this elder.',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: HeartPulse },
    { id: 'elders', label: 'Elders', icon: Users, count: elders.length },
    { id: 'medicines', label: 'Medicines', icon: Pill, count: medicines.length },
    {
      id: 'appointments',
      label: 'Appointments',
      icon: Calendar,
      count: appointments.length,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-teal-700 text-white'
          }`}
        >
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="opacity-80 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                Elder Care Reminder
              </h1>
              <p className="text-xs text-slate-500">
                Medicines, doctor visits &amp; caregiver profiles
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadAll}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Sync
            </button>
            <button
              onClick={() => {
                setMedicineForm((prev) => ({
                  ...prev,
                  elderId:
                    selectedElderId !== 'all'
                      ? selectedElderId
                      : elders[0]?.id
                      ? String(elders[0].id)
                      : '',
                }));
                setMedicineModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-teal-700"
            >
              <Plus className="h-4 w-4" />
              Add Medicine
            </button>
            <button
              onClick={openNewAppointmentModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Add Appointment
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 sm:px-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      active
                        ? 'bg-teal-50 text-teal-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* Connection Error */}
        {error && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <div>
              <strong className="font-semibold">Backend Connection Error:</strong>{' '}
              {error}
            </div>
            <button
              onClick={loadAll}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Filter Bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search elders, medicines, doctors..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="elderFilter" className="text-xs font-medium text-slate-500">
              Filter by Elder:
            </label>
            <select
              id="elderFilter"
              value={selectedElderId}
              onChange={(e) => setSelectedElderId(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none"
            >
              <option value="all">All Elders ({elders.length})</option>
              {elders.map((el) => (
                <option key={el.id} value={String(el.id)}>
                  {el.name} ({el.age} yrs)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-medium">Registered Elders</span>
                  <Users className="h-4 w-4 text-teal-600" />
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900">{elders.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-medium">Medicine Reminders</span>
                  <Pill className="h-4 w-4 text-indigo-600" />
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {filteredMedicines.length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-medium">Due Within 1 Hr</span>
                  <Bell className="h-4 w-4 text-amber-600" />
                </div>
                <p className="mt-2 text-2xl font-bold text-amber-600">
                  {dueSoonMedicines.length}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-medium">Appointments</span>
                  <Calendar className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {filteredAppointments.length}
                </p>
              </div>
            </div>

            {/* Due Soon Banner */}
            {dueSoonMedicines.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                  <Bell className="h-4 w-4 text-amber-600" />
                  <span>Medicines Due Soon</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {dueSoonMedicines.map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-amber-900 shadow-xs"
                    >
                      <Clock className="h-3.5 w-3.5 text-amber-600" />
                      <strong>{m.medicineName}</strong> ({m.dosage}) •{' '}
                      {formatTime12h(m.reminderTime)} • {m.elder?.name || 'Unassigned'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Two-Column Summary */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Medicines */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-900">
                    Daily Medicine Schedule
                  </h2>
                  <button
                    onClick={() => setActiveTab('medicines')}
                    className="text-xs font-medium text-teal-700 hover:underline"
                  >
                    Manage all
                  </button>
                </div>
                {filteredMedicines.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">
                    No medicine reminders found.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredMedicines.slice(0, 5).map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">
                              {m.medicineName}
                            </span>
                            <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                              {m.dosage}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {m.elder?.name || 'No elder'} • {m.frequency}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs">
                            <Clock className="h-3.5 w-3.5 text-teal-600" />
                            {formatTime12h(m.reminderTime)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Appointments */}
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-900">
                    Upcoming Appointments
                  </h2>
                  <button
                    onClick={() => setActiveTab('appointments')}
                    className="text-xs font-medium text-teal-700 hover:underline"
                  >
                    Manage all
                  </button>
                </div>
                {filteredAppointments.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">
                    No appointments scheduled.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {filteredAppointments.slice(0, 5).map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">
                            {a.doctorName}
                          </div>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {a.hospitalName} • {a.elder?.name || 'No elder'}
                          </p>
                        </div>
                        <div className="text-right text-xs">
                          <div className="font-semibold text-slate-800">
                            {a.appointmentDate}
                          </div>
                          <div className="text-slate-500">
                            {formatTime12h(a.appointmentTime)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {/* ELDERS VIEW */}
        {activeTab === 'elders' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Elders</h2>
              <button
                onClick={() => setElderModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
              >
                <Plus className="h-4 w-4" />
                Register Elder
              </button>
            </div>

            {filteredElders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <Users className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-600">
                  No elders registered yet.
                </p>
                <button
                  onClick={() => setElderModalOpen(true)}
                  className="mt-4 rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700"
                >
                  Add First Elder
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredElders.map((elder) => (
                  <div
                    key={elder.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                            <User className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">{elder.name}</h3>
                            <span className="text-xs text-slate-500">
                              Age {elder.age} • ID #{elder.id}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 space-y-2 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-slate-400" />
                          <span>{elder.phone || '—'}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                          <span>{elder.address || '—'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                      <button
                        onClick={() => handleViewDetail('elder', elder.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Details
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ type: 'elder', item: elder })}
                        className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:underline"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MEDICINES VIEW */}
        {activeTab === 'medicines' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Medicine Reminders</h2>
              <button
                onClick={() => {
                  setMedicineForm((prev) => ({
                    ...prev,
                    elderId:
                      selectedElderId !== 'all'
                        ? selectedElderId
                        : elders[0]?.id
                        ? String(elders[0].id)
                        : '',
                  }));
                  setMedicineModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
              >
                <Plus className="h-4 w-4" />
                Add Medicine
              </button>
            </div>

            {filteredMedicines.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <Pill className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-600">
                  No medicine reminders found.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Medicine</th>
                        <th className="px-4 py-3">Dosage</th>
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3">Frequency</th>
                        <th className="px-4 py-3">Elder</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredMedicines.map((med) => (
                        <tr key={med.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {med.medicineName}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                              {med.dosage}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700">
                            {formatTime12h(med.reminderTime)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{med.frequency}</td>
                          <td className="px-4 py-3 text-slate-700">
                            {med.elder?.name || '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-3">
                              <button
                                onClick={() => handleViewDetail('medicine', med.id)}
                                className="text-slate-500 hover:text-teal-700"
                                title="View"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() =>
                                  setConfirmDelete({ type: 'medicine', item: med })
                                }
                                className="text-slate-500 hover:text-rose-600"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* APPOINTMENTS VIEW */}
        {activeTab === 'appointments' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Doctor Appointments</h2>
              <button
                onClick={openNewAppointmentModal}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
              >
                <Plus className="h-4 w-4" />
                Schedule Appointment
              </button>
            </div>

            {filteredAppointments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <Calendar className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-600">
                  No appointments scheduled.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredAppointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Stethoscope className="h-4 w-4 text-teal-600" />
                            <h3 className="font-semibold text-slate-900">
                              {appt.doctorName}
                            </h3>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                            <Hospital className="h-3.5 w-3.5" />
                            <span>{appt.hospitalName}</span>
                          </div>
                        </div>
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {appt.elder?.name || 'Unassigned'}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-700">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-teal-600" />
                          {appt.appointmentDate}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-teal-600" />
                          {formatTime12h(appt.appointmentTime)}
                        </span>
                      </div>

                      {appt.description && (
                        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                          {appt.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-4 border-t border-slate-100 pt-3 text-xs font-medium">
                      <button
                        onClick={() => handleViewDetail('appointment', appt.id)}
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-teal-700"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </button>
                      <button
                        onClick={() => openEditAppointmentModal(appt)}
                        className="inline-flex items-center gap-1 text-teal-700 hover:underline"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() =>
                          setConfirmDelete({ type: 'appointment', item: appt })
                        }
                        className="inline-flex items-center gap-1 text-rose-600 hover:underline"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ADD ELDER MODAL */}
      {elderModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Register Elder</h3>
              <button
                onClick={() => setElderModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddElder} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Full Name
                </label>
                <input
                  required
                  type="text"
                  value={elderForm.name}
                  onChange={(e) => setElderForm({ ...elderForm, name: e.target.value })}
                  placeholder="e.g., Ramesh Sharma"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Age
                  </label>
                  <input
                    required
                    min="1"
                    max="130"
                    type="number"
                    value={elderForm.age}
                    onChange={(e) => setElderForm({ ...elderForm, age: e.target.value })}
                    placeholder="72"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Phone
                  </label>
                  <input
                    required
                    type="text"
                    value={elderForm.phone}
                    onChange={(e) =>
                      setElderForm({ ...elderForm, phone: e.target.value })
                    }
                    placeholder="+91 98765 43210"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Address
                </label>
                <textarea
                  required
                  rows={2}
                  value={elderForm.address}
                  onChange={(e) =>
                    setElderForm({ ...elderForm, address: e.target.value })
                  }
                  placeholder="Residential address"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setElderModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Elder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD MEDICINE MODAL */}
      {medicineModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Add Medicine Reminder</h3>
              <button
                onClick={() => setMedicineModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddMedicine} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Elder
                </label>
                <select
                  required
                  value={medicineForm.elderId}
                  onChange={(e) =>
                    setMedicineForm({ ...medicineForm, elderId: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                >
                  <option value="">Select elder...</option>
                  {elders.map((el) => (
                    <option key={el.id} value={String(el.id)}>
                      {el.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Medicine Name
                </label>
                <input
                  required
                  type="text"
                  value={medicineForm.medicineName}
                  onChange={(e) =>
                    setMedicineForm({ ...medicineForm, medicineName: e.target.value })
                  }
                  placeholder="e.g., Metformin"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Dosage
                  </label>
                  <input
                    required
                    type="text"
                    value={medicineForm.dosage}
                    onChange={(e) =>
                      setMedicineForm({ ...medicineForm, dosage: e.target.value })
                    }
                    placeholder="500 mg"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Reminder Time
                  </label>
                  <input
                    required
                    type="time"
                    value={medicineForm.reminderTime}
                    onChange={(e) =>
                      setMedicineForm({ ...medicineForm, reminderTime: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Frequency
                </label>
                <input
                  required
                  type="text"
                  value={medicineForm.frequency}
                  onChange={(e) =>
                    setMedicineForm({ ...medicineForm, frequency: e.target.value })
                  }
                  placeholder="Once daily after breakfast"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMedicineModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT APPOINTMENT MODAL */}
      {appointmentModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingAppointment ? 'Edit Appointment' : 'Schedule Appointment'}
              </h3>
              <button
                onClick={() => setAppointmentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveAppointment} className="space-y-4">
              {!editingAppointment && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Elder
                  </label>
                  <select
                    required
                    value={appointmentForm.elderId}
                    onChange={(e) =>
                      setAppointmentForm({ ...appointmentForm, elderId: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  >
                    <option value="">Select elder...</option>
                    {elders.map((el) => (
                      <option key={el.id} value={String(el.id)}>
                        {el.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Doctor Name
                </label>
                <input
                  required
                  type="text"
                  value={appointmentForm.doctorName}
                  onChange={(e) =>
                    setAppointmentForm({ ...appointmentForm, doctorName: e.target.value })
                  }
                  placeholder="Dr. Ananya Rao"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Hospital Name
                </label>
                <input
                  required
                  type="text"
                  value={appointmentForm.hospitalName}
                  onChange={(e) =>
                    setAppointmentForm({
                      ...appointmentForm,
                      hospitalName: e.target.value,
                    })
                  }
                  placeholder="Apollo Specialty Hospital"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Date
                  </label>
                  <input
                    required
                    type="date"
                    value={appointmentForm.appointmentDate}
                    onChange={(e) =>
                      setAppointmentForm({
                        ...appointmentForm,
                        appointmentDate: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Time
                  </label>
                  <input
                    required
                    type="time"
                    value={appointmentForm.appointmentTime}
                    onChange={(e) =>
                      setAppointmentForm({
                        ...appointmentForm,
                        appointmentTime: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Description / Notes
                </label>
                <textarea
                  rows={2}
                  value={appointmentForm.description}
                  onChange={(e) =>
                    setAppointmentForm({
                      ...appointmentForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Quarterly blood pressure and ECG follow-up"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAppointmentModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {submitting
                    ? 'Saving...'
                    : editingAppointment
                    ? 'Update Appointment'
                    : 'Schedule Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {detailModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold capitalize text-slate-900">
                {detailModal.type} Details
              </h3>
              <button
                onClick={() => setDetailModal(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2 text-sm text-slate-700">
              {Object.entries(detailModal.data || {}).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-start justify-between gap-4 border-b border-slate-100 py-2"
                >
                  <span className="font-medium capitalize text-slate-500">{key}</span>
                  <span className="text-right font-semibold text-slate-900">
                    {typeof value === 'object' && value !== null
                      ? value.name || `#${value.id}`
                      : String(value ?? '—')}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setDetailModal(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {confirmDelete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Confirm Delete</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete this {confirmDelete.type}? This action
              cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                disabled={submitting}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {submitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
