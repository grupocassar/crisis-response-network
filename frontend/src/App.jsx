import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Search, User, Map, AlertTriangle, CheckCircle, Clock, ShieldCheck, Plus, MapPin, RefreshCw, Bell, Edit3 } from 'lucide-react';

// --- CREDENCIALES REALES SUPABASE ---
const SUPABASE_URL = 'https://mtbtgkzwaukqkayxfwqn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10YnRna3p3YXVrcWtheXhmd3FuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNTMzMzUsImV4cCI6MjA5NzkyOTMzNX0.Hhm8kNtc5AU9mg37n8bAT2W7iA9HnaK4KD5F69vYkdI';

const HEADERS = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// ─────────────────────────────────────────────
// Componentes auxiliares FUERA de App
// ─────────────────────────────────────────────

const TrustBadge = memo(({ level }) => {
  if (level >= 3) return <span className="bg-blue-600 text-white text-[10px] px-2 py-1 font-bold uppercase tracking-wider flex items-center gap-1 w-max"><ShieldCheck size={12}/> Oficial</span>;
  if (level === 2) return <span className="bg-green-600 text-white text-[10px] px-2 py-1 font-bold uppercase tracking-wider flex items-center gap-1 w-max"><ShieldCheck size={12}/> Rescate</span>;
  if (level === 1) return <span className="bg-yellow-500 text-black text-[10px] px-2 py-1 font-bold uppercase tracking-wider flex items-center gap-1 w-max"><User size={12}/> Familiar</span>;
  return <span className="bg-gray-200 text-gray-600 text-[10px] px-2 py-1 font-bold uppercase tracking-wider flex items-center gap-1 w-max"><AlertTriangle size={12}/> Civil (Nivel 0)</span>;
});

const StatusPill = memo(({ status }) => {
  const s = status ? status.toLowerCase() : '';
  let bg = 'bg-gray-800';
  if (s === 'buscado') bg = 'bg-red-600';
  if (s === 'a_salvo') bg = 'bg-green-600';
  if (s === 'herido') bg = 'bg-orange-500';
  if (s === 'fallecido') bg = 'bg-black border border-gray-500';
  return <span className={`${bg} text-white text-xs px-2 py-1 font-bold uppercase tracking-wide`}>{status.replace('_', ' ')}</span>;
});

const PersonaCard = memo(({ item, onClick }) => (
  <div onClick={onClick} className="bg-white border-2 border-black p-4 cursor-pointer active:scale-[0.98] transition-transform">
    <div className="flex justify-between items-start mb-3">
      <TrustBadge level={item.trust_level} />
      <StatusPill status={item.status} />
    </div>
    <h3 className="text-lg font-black leading-tight mb-2 uppercase">{item.name_desc}</h3>
    {item.document_id && (
      <p className="text-xs font-black uppercase tracking-wide text-blue-700 mb-2">C.I: {item.document_id}</p>
    )}
    <p className="text-sm text-gray-700 font-medium line-clamp-2">
      <MapPin size={14} className="inline mr-1 -mt-1"/>
      {item.location_text}
    </p>
    <p className="text-[10px] text-gray-400 font-mono mt-3 uppercase text-right">
      {new Date(item.created_at).toLocaleString()}
    </p>
  </div>
));

const ZonaCard = memo(({ item, onClick }) => (
  <div onClick={onClick} className="bg-white border-2 border-black p-4 cursor-pointer active:scale-[0.98] transition-transform">
    <div className="flex justify-between items-start mb-3">
      <TrustBadge level={item.trust_level} />
      <span className={`text-xs px-2 py-1 font-bold uppercase text-white ${item.urgency === 'alta' ? 'bg-red-600' : 'bg-orange-500'}`}>
        Urgencia: {item.urgency}
      </span>
    </div>
    <h3 className="text-lg font-black leading-tight mb-2 uppercase">{item.name}</h3>
    <p className="text-sm text-gray-700 font-medium line-clamp-2">
      <MapPin size={14} className="inline mr-1 -mt-1"/>
      {item.situation}
    </p>
    <p className="text-[10px] text-gray-400 font-mono mt-3 uppercase text-right">
      {new Date(item.created_at).toLocaleString()}
    </p>
  </div>
));

// ─────────────────────────────────────────────
// APP PRINCIPAL
// ─────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState('home');
  const [activeTab, setActiveTab] = useState('personas');
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState(null);

  const [incidentId, setIncidentId] = useState(null);
  const [personas, setPersonas] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formPersona, setFormPersona] = useState({ nombreDesc: '', documento: '', estado: 'buscado', ubicacion: '', contacto: '' });
  const [formZona, setFormZona] = useState({ nombre: '', situacion: '', urgencia: 'alta', contacto: '' });
  
  // FIX RESTAURADO: Estados para Aportar Información
  const [formAportePersona, setFormAportePersona] = useState({ status: '', location_text: '', documento: '' });
  const [formAporteZona, setFormAporteZona] = useState({ urgency: '', situation: '' });

  // NUEVO: Estados para el Historial (Timeline)
  const [historyLogs, setHistoryLogs] = useState([]);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false); // NUEVO ESTADO DEL MODAL

  const swipeStartX = useRef(null);
  const swipeStartY = useRef(null);
  const isScrolling = useRef(null);

  useEffect(() => {
    const initApp = async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/incidents?slug=eq.terremoto-ve-2026&select=id`, { headers: HEADERS });
        const data = await res.json();
        if (data && data.length > 0) setIncidentId(data[0].id);
      } catch (err) {
        showNotification("Error de conexión. Trabajando offline.", true);
      }
    };
    initApp();
  }, []);

  const fetchData = useCallback(async (silent = false) => {
    if (!incidentId) return;
    if (!silent) setInitialLoading(true);
    setIsSyncing(true);
    try {
      const [resP, resZ] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/persons?incident_id=eq.${incidentId}&order=created_at.desc`, { headers: HEADERS }),
        fetch(`${SUPABASE_URL}/rest/v1/zones?incident_id=eq.${incidentId}&order=created_at.desc`, { headers: HEADERS })
      ]);
      const dataP = await resP.json();
      const dataZ = await resZ.json();
      setPersonas(Array.isArray(dataP) ? dataP : []);
      setZonas(Array.isArray(dataZ) ? dataZ : []);
    } catch (err) {
      console.error("Error obteniendo datos:", err);
    } finally {
      setInitialLoading(false);
      setIsSyncing(false);
    }
  }, [incidentId]);

  useEffect(() => { if (incidentId) fetchData(); }, [incidentId, fetchData]);
  useEffect(() => {
    if (!incidentId) return;
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, [incidentId, fetchData]);

  // NUEVO: Cargar historial al abrir los detalles de un perfil
  useEffect(() => {
    if (view === 'detail' && selectedItem) {
      fetch(`${SUPABASE_URL}/rest/v1/history_logs?record_id=eq.${selectedItem.id}&order=created_at.desc`, { headers: HEADERS })
        .then(res => res.json())
        .then(data => {
          setHistoryLogs(data || []);
          setShowFullHistory(false); // Resetear el botón desplegable al cambiar de perfil
        })
        .catch(err => console.error("Error cargando historial:", err));
    }
  }, [view, selectedItem]);

  const showNotification = (msg, isError = false) => {
    setNotification({ msg, isError });
    setTimeout(() => setNotification(null), 4000);
  };

  const goBack = useCallback(() => {
    setView(prev => {
      switch (prev) {
        case 'personas':
        case 'zonas': return 'home';
        case 'detail': return activeTab;
        case 'form_persona': return 'personas';
        case 'form_zona': return 'zonas';
        case 'form_aporte_persona': 
        case 'form_aporte_zona': return 'detail'; // FIX RESTAURADO: Soporte para volver de aporte a detail
        default: return prev;
      }
    });
  }, [activeTab]);

  const handleTouchStart = useCallback((e) => {
    const touch = e.targetTouches[0];
    if (!touch) return;
    if (e.target.closest('button, a, input, textarea, select')) return;
    swipeStartX.current = touch.clientX;
    swipeStartY.current = touch.clientY;
    isScrolling.current = null;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (swipeStartX.current === null) return;
    const touch = e.targetTouches[0];
    const deltaX = touch.clientX - swipeStartX.current;
    const deltaY = touch.clientY - swipeStartY.current;
    if (isScrolling.current === null) {
      isScrolling.current = Math.abs(deltaY) > Math.abs(deltaX);
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (swipeStartX.current === null) return;
    if (isScrolling.current) {
      swipeStartX.current = null;
      swipeStartY.current = null;
      isScrolling.current = null;
      return;
    }
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - swipeStartX.current;
    const startedFromLeft = swipeStartX.current < 60; 
    if (startedFromLeft && deltaX > 60 && view !== 'home') goBack();
    swipeStartX.current = null;
    swipeStartY.current = null;
    isScrolling.current = null;
  }, [view, goBack]);

  const handleTouchCancel = useCallback(() => {
    swipeStartX.current = null;
    swipeStartY.current = null;
    isScrolling.current = null;
  }, []);

  // ─── LÓGICA DE ENVÍO (CREAR) ───
  const handleSubmitPersona = async (e) => {
    e.preventDefault();
    if (!incidentId) return;
    setIsSubmitting(true);
    try {
      const payload = { incident_id: incidentId, name_desc: formPersona.nombreDesc, document_id: formPersona.documento, status: formPersona.estado, location_text: formPersona.ubicacion, reporter_contact: formPersona.contacto, trust_level: 0 };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/persons`, { method: 'POST', headers: HEADERS, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      const newData = await res.json();
      const newRecord = newData[0];
      
      // NUEVO: Registrar creación en el historial
      await fetch(`${SUPABASE_URL}/rest/v1/history_logs`, {
        method: 'POST', headers: HEADERS, body: JSON.stringify({
          record_id: newRecord.id,
          table_name: 'persons',
          action: 'CREADO',
          details: `Reporte inicial. Estado: ${formPersona.estado.toUpperCase()}. Ubicación: ${formPersona.ubicacion}`
        })
      }).catch(console.error);

      setPersonas(prev => [newRecord, ...prev]);
      setFormPersona({ nombreDesc: '', documento: '', estado: 'buscado', ubicacion: '', contacto: '' });
      showNotification("Reporte publicado exitosamente");

      // UX EXCELENTE: Redirige directamente al detalle de la persona recién creada para cerrar el ciclo
      setSelectedItem(newRecord);
      setActiveTab('personas');
      setView('detail');
      setShowSuccessModal(true); // ACTIVAR MODAL DE ÉXITO
    } catch { showNotification("Error de red. Intente de nuevo.", true); } finally { setIsSubmitting(false); }
  };

  const handleSubmitZona = async (e) => {
    e.preventDefault();
    if (!incidentId) return;
    setIsSubmitting(true);
    try {
      const payload = { incident_id: incidentId, name: formZona.nombre, urgency: formZona.urgencia, situation: formZona.situacion, reporter_contact: formZona.contacto, trust_level: 0 };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/zones`, { method: 'POST', headers: HEADERS, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      const newData = await res.json();
      const newRecord = newData[0];
      
      // NUEVO: Registrar creación en el historial
      await fetch(`${SUPABASE_URL}/rest/v1/history_logs`, {
        method: 'POST', headers: HEADERS, body: JSON.stringify({
          record_id: newRecord.id,
          table_name: 'zones',
          action: 'CREADO',
          details: `Foco reportado. Urgencia: ${formZona.urgencia.toUpperCase()}. Situación: ${formZona.situacion}`
        })
      }).catch(console.error);

      setZonas(prev => [newRecord, ...prev]);
      setFormZona({ nombre: '', situacion: '', urgencia: 'alta', contacto: '' });
      showNotification("Zona de emergencia reportada");

      // UX EXCELENTE: Redirige directamente al detalle del foco recién creado
      setSelectedItem(newRecord);
      setActiveTab('zonas');
      setView('detail');
      setShowSuccessModal(true); // ACTIVAR MODAL DE ÉXITO
    } catch { showNotification("Error de red. Intente de nuevo.", true); } finally { setIsSubmitting(false); }
  };

  // ─── FIX RESTAURADO: LÓGICA DE ACTUALIZACIÓN (PATCH) ───
  const handleAportarPersona = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const patchPayload = {
        status: formAportePersona.status,
        location_text: formAportePersona.location_text,
        ...(formAportePersona.documento ? { document_id: formAportePersona.documento } : {})
      };

      const res = await fetch(`${SUPABASE_URL}/rest/v1/persons?id=eq.${selectedItem.id}`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify(patchPayload)
      });
      if (!res.ok) throw new Error();
      const updatedData = await res.json();
      const updatedRecord = updatedData[0];
      
      // NUEVO: Registrar actualización en el historial
      await fetch(`${SUPABASE_URL}/rest/v1/history_logs`, {
        method: 'POST', headers: HEADERS, body: JSON.stringify({
          record_id: selectedItem.id,
          table_name: 'persons',
          action: 'ACTUALIZADO',
          details: `Nuevo Estado: ${formAportePersona.status.toUpperCase()}. Nueva Ubicación: ${formAportePersona.location_text}${formAportePersona.documento ? `. Cédula/Pasaporte: ${formAportePersona.documento}` : ''}`
        })
      }).catch(console.error);

      setPersonas(prev => prev.map(p => p.id === updatedRecord.id ? updatedRecord : p));
      setSelectedItem(updatedRecord);
      showNotification("Información actualizada correctamente");
      setView('detail');
    } catch { showNotification("Error al actualizar.", true); } finally { setIsSubmitting(false); }
  };

  const handleAportarZona = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/zones?id=eq.${selectedItem.id}`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify(formAporteZona)
      });
      if (!res.ok) throw new Error();
      const updatedData = await res.json();
      const updatedRecord = updatedData[0];
      
      // NUEVO: Registrar actualización en el historial
      await fetch(`${SUPABASE_URL}/rest/v1/history_logs`, {
        method: 'POST', headers: HEADERS, body: JSON.stringify({
          record_id: selectedItem.id,
          table_name: 'zones',
          action: 'ACTUALIZADO',
          details: `Nueva Urgencia: ${formAporteZona.urgency.toUpperCase()}. Evolución: ${formAporteZona.situation}`
        })
      }).catch(console.error);

      setZonas(prev => prev.map(z => z.id === updatedRecord.id ? updatedRecord : z));
      setSelectedItem(updatedRecord);
      showNotification("Información actualizada correctamente");
      setView('detail');
    } catch { showNotification("Error al actualizar.", true); } finally { setIsSubmitting(false); }
  };

  // ─────────────────────────────────────────────
  // VISTAS
  // ─────────────────────────────────────────────

  const HomeView = () => (
    <div className="flex flex-col h-full gap-4 animate-fade-in">
      <div className="bg-black text-white p-6 pb-8">
        <div className="flex justify-between items-start">
          <h2 className="text-3xl font-black uppercase tracking-tight mb-2 leading-none">Sistema de<br/>Respuesta</h2>
          {isSyncing && <RefreshCw size={16} className="animate-spin text-gray-500 mt-1" />}
        </div>
        <p className="text-gray-400 text-sm font-medium mt-1">Conectado al incidente activo. Seleccione módulo.</p>
      </div>
      <div className="px-4 flex flex-col gap-4 -mt-6">
        <a href="https://t.me/red_emergencia_bot" target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white p-6 border-4 border-black hover:bg-blue-700 flex flex-col items-start gap-2 transition-transform active:scale-[0.98]">
          <Bell size={32} className="mb-2" />
          <div className="flex justify-between w-full items-center">
            <h3 className="text-2xl font-black uppercase">Alertas en Vivo</h3>
            <span className="bg-black text-white text-xs px-2 py-1 font-bold">TELEGRAM</span>
          </div>
          <p className="text-left text-sm text-blue-100 font-medium">Recibe notificaciones críticas de rescates en Telegram.</p>
        </a>
        <button onClick={() => setView('personas')} className="bg-white p-6 border-4 border-black hover:bg-gray-50 flex flex-col items-start gap-2 transition-transform active:scale-[0.98]">
          <User size={32} className="mb-2" />
          <div className="flex justify-between w-full items-center">
            <h3 className="text-2xl font-black uppercase">Personas</h3>
            <span className="bg-black text-white text-xs px-2 py-1 font-bold">{personas.length} regs</span>
          </div>
          <p className="text-left text-sm text-gray-600 font-medium">Buscar familiares o reportar personas extraviadas / encontradas.</p>
        </button>
        <button onClick={() => setView('zonas')} className="bg-red-600 text-white p-6 border-4 border-black hover:bg-red-700 flex flex-col items-start gap-2 transition-transform active:scale-[0.98]">
          <Map size={32} className="mb-2" />
          <div className="flex justify-between w-full items-center">
            <h3 className="text-2xl font-black uppercase">Zonas Críticas</h3>
            <span className="bg-white text-red-600 text-xs px-2 py-1 font-black">{zonas.length} regs</span>
          </div>
          <p className="text-left text-sm text-red-100 font-medium">Reportar derrumbes, vías bloqueadas o solicitud de rescate.</p>
        </button>
      </div>
    </div>
  );

  const DashboardView = ({ type }) => {
    const isPersonas = type === 'personas';
    const data = isPersonas ? personas : zonas;
    const filtered = data.filter(item => {
      if (!searchQuery) return true;
      const str = isPersonas ? item.name_desc : item.name;
      return str && str.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
      <div className="flex flex-col h-full animate-fade-in">
        <div className="bg-black p-4 sticky top-0 z-10 flex flex-col gap-3 shadow-lg">
          <div className="flex justify-between items-center text-white">
            <h2 className="text-xl font-black uppercase flex items-center gap-2">
              {isPersonas ? <User size={20}/> : <Map size={20}/>}
              {isPersonas ? 'Personas' : 'Zonas'}
            </h2>
            <div className="flex items-center gap-3">
              {isSyncing && <RefreshCw size={14} className="animate-spin text-gray-500" />}
              <button onClick={() => { setSearchQuery(''); setView('home'); }} className="text-sm font-bold bg-white text-black px-3 py-1 hover:bg-gray-200">Volver</button>
            </div>
          </div>
          <input type="text" placeholder={isPersonas ? "Buscar nombre o descripción..." : "Buscar sector o calle..."} className="w-full p-3 text-black font-medium focus:outline-none rounded-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          <button onClick={() => setView(isPersonas ? 'form_persona' : 'form_zona')} className="w-full bg-blue-600 text-white font-bold p-3 uppercase tracking-wide hover:bg-blue-700 flex justify-center items-center gap-2">
            <Plus size={18}/> {isPersonas ? 'Crear Reporte de Persona' : 'Reportar Nueva Zona'}
          </button>
        </div>
        <div className="p-4 space-y-4 bg-gray-100 min-h-screen">
          {initialLoading ? (
            <p className="text-center font-bold text-gray-500 py-10 animate-pulse">Cargando base de datos...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 px-4">
              <p className="font-bold text-gray-500 mb-2">
                {searchQuery 
                  ? `No encontramos coincidencias para "${searchQuery}".` 
                  : "No hay registros aún."}
              </p>
              {searchQuery && (
                <p className="text-sm text-gray-600 font-medium">
                  Si tienes información, usa el botón azul de arriba para crear este reporte.
                </p>
              )}
            </div>
          ) : (
            filtered.map(item =>
              isPersonas
                ? <PersonaCard key={item.id} item={item} onClick={() => { setSelectedItem(item); setActiveTab(type); setView('detail'); }} />
                : <ZonaCard key={item.id} item={item} onClick={() => { setSelectedItem(item); setActiveTab(type); setView('detail'); }} />
            )
          )}
        </div>
      </div>
    );
  };

  const DetailView = () => {
    if (!selectedItem) return null;
    const isPersona = activeTab === 'personas';

    return (
      <div className="bg-gray-100 min-h-screen animate-fade-in pb-20">
        <div className="bg-black text-white p-4 sticky top-0 flex justify-between items-center z-10 shadow-lg">
          <button onClick={goBack} className="font-bold flex items-center gap-1 hover:text-gray-300">← Volver</button>
          <span className="text-xs font-mono font-bold opacity-50 truncate w-32 text-right">{selectedItem.id?.split('-')[0]}</span>
        </div>
        <div className="p-4 space-y-4">
          <div className="bg-white border-4 border-black p-5">
            <div className="flex flex-col items-start gap-3 mb-4">
              <TrustBadge level={selectedItem.trust_level} />
              {isPersona ? <StatusPill status={selectedItem.status} /> : <StatusPill status={`Urgencia ${selectedItem.urgency}`} />}
            </div>
            <h2 className="text-2xl font-black uppercase mb-4 leading-tight border-b-2 border-gray-100 pb-4">
              {isPersona ? selectedItem.name_desc : selectedItem.name}
            </h2>
            {isPersona && selectedItem.document_id && (
              <p className="text-sm font-black uppercase tracking-wide text-blue-700 -mt-2 mb-3">C.I: {selectedItem.document_id}</p>
            )}
            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{isPersona ? 'Ubicación' : 'Situación'}</p>
                <p className="font-medium text-lg leading-snug">{isPersona ? selectedItem.location_text : selectedItem.situation}</p>
              </div>
              <div className="bg-gray-50 p-3 border border-gray-200">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Contacto del reporte</p>
                <p className="font-bold">{selectedItem.reporter_contact}</p>
                <p className="text-[10px] text-gray-400 font-mono mt-1 uppercase">Reg: {new Date(selectedItem.created_at).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* NUEVO: LÍNEA DE TIEMPO (TIMELINE) INTELIGENTE */}
          <div className="bg-white border-4 border-black p-4 shadow-sm">
            <h3 className="font-black uppercase mb-3 flex items-center gap-2 text-sm border-b-2 border-gray-100 pb-2">
              <Clock size={16}/> Historial de Actividad
            </h3>
            {historyLogs.length === 0 ? (
              <p className="text-xs text-gray-500 font-mono text-center py-2">Registrando actividad...</p>
            ) : (
              <div className="space-y-3">
                {(showFullHistory ? historyLogs : historyLogs.slice(0, 3)).map(log => (
                  <div key={log.id} className="border-l-4 border-black pl-3 ml-1 py-1">
                    <p className="text-[10px] text-gray-500 font-mono uppercase">{new Date(log.created_at).toLocaleString()}</p>
                    <p className={`text-xs font-bold uppercase ${log.action === 'CREADO' ? 'text-blue-600' : 'text-green-600'}`}>{log.action}</p>
                    <p className="text-sm font-medium leading-snug">{log.details}</p>
                  </div>
                ))}
                {historyLogs.length > 3 && (
                  <button 
                    onClick={() => setShowFullHistory(!showFullHistory)} 
                    className="w-full bg-gray-100 hover:bg-gray-200 text-black font-bold uppercase text-xs p-3 mt-2 transition-colors border-2 border-transparent active:border-black"
                  >
                    {showFullHistory ? 'Ocultar historial' : `Ver ${historyLogs.length - 3} registros más`}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* FIX RESTAURADO: Botón con onClick */}
          <button 
            onClick={() => {
              if (isPersona) {
                setFormAportePersona({ status: selectedItem.status, location_text: selectedItem.location_text, documento: selectedItem.document_id || '' });
                setView('form_aporte_persona');
              } else {
                setFormAporteZona({ urgency: selectedItem.urgency, situation: selectedItem.situation });
                setView('form_aporte_zona');
              }
            }}
            className="w-full bg-black text-white font-black uppercase p-4 hover:bg-gray-800 flex items-center justify-center gap-2 border-2 border-transparent shadow-md"
          >
            <Edit3 size={18}/> Aportar Nueva Información
          </button>
        </div>
      </div>
    );
  };

  const FormPersonaView = () => (
    <div className="bg-white min-h-screen animate-fade-in">
      <div className="bg-black text-white p-4 sticky top-0 flex justify-between items-center shadow-md">
        <h2 className="font-black uppercase">Reporte: Persona</h2>
        <button onClick={() => setView('personas')} className="text-sm font-bold text-gray-400 hover:text-white">Cancelar</button>
      </div>
      <form onSubmit={handleSubmitPersona} className="p-4 space-y-5">
        <div className="bg-yellow-400 text-black p-3 text-xs font-bold uppercase tracking-wide border-2 border-black">Solo llena lo que sepas. Puedes usar descripciones físicas.</div>
        <div><label className="block text-sm font-black uppercase mb-2">1. Nombre o Descripción *</label><input required type="text" placeholder="Ej: Luis, o Niño de camisa roja" className="w-full p-4 border-2 border-black font-medium focus:outline-none focus:border-blue-500" value={formPersona.nombreDesc} onChange={e => setFormPersona(f => ({...f, nombreDesc: e.target.value}))} /></div>
        <div><label className="block text-sm font-black uppercase mb-2">2. Cédula o Pasaporte (Opcional)</label><input type="text" placeholder="Ej: V-12345678 o P123456" className="w-full p-4 border-2 border-black font-medium focus:outline-none focus:border-blue-500" value={formPersona.documento} onChange={e => setFormPersona(f => ({...f, documento: e.target.value}))} /></div>
        <div>
          <label className="block text-sm font-black uppercase mb-2">Estado Actual *</label>
          <div className="grid grid-cols-2 gap-2">
            {['buscado', 'a_salvo', 'herido', 'fallecido'].map(s => (<button key={s} type="button" onClick={() => setFormPersona(f => ({...f, estado: s}))} className={`p-3 font-bold uppercase text-xs border-2 transition-colors ${formPersona.estado === s ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-300'}`}>{s.replace('_', ' ')}</button>))}
          </div>
        </div>
        <div><label className="block text-sm font-black uppercase mb-2">3. Último Lugar Visto o Refugio/Hospital Actual *</label><input required type="text" placeholder="Sector, calle, refugio u hospital..." className="w-full p-4 border-2 border-black font-medium focus:outline-none focus:border-blue-500" value={formPersona.ubicacion} onChange={e => setFormPersona(f => ({...f, ubicacion: e.target.value}))} /></div>
        <div><label className="block text-sm font-black uppercase mb-2">4. Tu Teléfono *</label><input required type="tel" placeholder="0412-1234567" className="w-full p-4 border-2 border-black font-medium focus:outline-none focus:border-blue-500 font-mono" value={formPersona.contacto} onChange={e => setFormPersona(f => ({...f, contacto: e.target.value}))} /></div>
        <button disabled={isSubmitting} type="submit" className="w-full bg-blue-600 text-white font-black text-lg p-5 mt-4 uppercase hover:bg-blue-700 disabled:opacity-50 transition-opacity">{isSubmitting ? 'Guardando...' : 'Publicar Reporte'}</button>
      </form>
    </div>
  );

  const FormZonaView = () => (
    <div className="bg-white min-h-screen animate-fade-in">
      <div className="bg-red-600 text-white p-4 sticky top-0 flex justify-between items-center shadow-md">
        <h2 className="font-black uppercase">Reportar Zona Crítica</h2>
        <button onClick={() => setView('zonas')} className="text-sm font-bold text-red-200 hover:text-white">Cancelar</button>
      </div>
      <form onSubmit={handleSubmitZona} className="p-4 space-y-5">
        <div><label className="block text-sm font-black uppercase mb-2">1. Nombre del Sector / Zona *</label><input required type="text" placeholder="Ej: Sector El Limón" className="w-full p-4 border-2 border-black font-medium focus:outline-none focus:border-red-500" value={formZona.nombre} onChange={e => setFormZona(f => ({...f, nombre: e.target.value}))} /></div>
        <div>
          <label className="block text-sm font-black uppercase mb-2">2. Nivel de Urgencia *</label>
          <div className="grid grid-cols-3 gap-2">
            {['alta', 'media', 'baja'].map(u => (<button key={u} type="button" onClick={() => setFormZona(f => ({...f, urgencia: u}))} className={`p-3 font-bold uppercase text-xs border-2 transition-colors ${formZona.urgencia === u ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-300'}`}>{u}</button>))}
          </div>
        </div>
        <div><label className="block text-sm font-black uppercase mb-2">3. Situación (Describe la emergencia) *</label><textarea required rows="4" placeholder="Ej: Edificio colapsado, personas atrapadas..." className="w-full p-4 border-2 border-black font-medium focus:outline-none focus:border-red-500 resize-none" value={formZona.situacion} onChange={e => setFormZona(f => ({...f, situacion: e.target.value}))} /></div>
        <div><label className="block text-sm font-black uppercase mb-2">4. Tu Teléfono *</label><input required type="tel" placeholder="0414-1234567" className="w-full p-4 border-2 border-black font-medium focus:outline-none focus:border-red-500 font-mono" value={formZona.contacto} onChange={e => setFormZona(f => ({...f, contacto: e.target.value}))} /></div>
        <button disabled={isSubmitting} type="submit" className="w-full bg-red-600 text-white font-black text-lg p-5 mt-4 uppercase hover:bg-red-700 disabled:opacity-50 transition-opacity">{isSubmitting ? 'Enviando Alerta...' : 'Alertar a Rescatistas'}</button>
      </form>
    </div>
  );

  // ─── FIX RESTAURADO: VISTAS DE APORTE ───
  const FormAportePersonaView = () => (
    <div className="bg-white min-h-screen animate-fade-in">
      <div className="bg-black text-white p-4 sticky top-0 flex justify-between items-center shadow-md">
        <h2 className="font-black uppercase">Actualizar Persona</h2>
        <button onClick={() => setView('detail')} className="text-sm font-bold text-gray-400">Cancelar</button>
      </div>
      <form onSubmit={handleAportarPersona} className="p-4 space-y-5">
        <div>
          <label className="block text-sm font-black uppercase mb-2">Nuevo Estado Vital</label>
          <div className="grid grid-cols-2 gap-2">
            {['buscado', 'a_salvo', 'herido', 'fallecido'].map(s => (
              <button key={s} type="button" onClick={() => setFormAportePersona({...formAportePersona, status: s})} className={`p-3 font-bold uppercase text-xs border-2 ${formAportePersona.status === s ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-300'}`}>
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-black uppercase mb-2">2. Cédula o Pasaporte (Opcional)</label>
          <input type="text" className="w-full p-4 border-2 border-black font-medium focus:outline-none focus:border-blue-500" value={formAportePersona.documento} onChange={e => setFormAportePersona({...formAportePersona, documento: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-black uppercase mb-2">3. Último Lugar Visto o Refugio/Hospital Actual *</label>
          <input required type="text" className="w-full p-4 border-2 border-black font-medium focus:outline-none focus:border-blue-500" value={formAportePersona.location_text} onChange={e => setFormAportePersona({...formAportePersona, location_text: e.target.value})} />
        </div>
        <button disabled={isSubmitting} type="submit" className="w-full bg-blue-600 text-white font-black text-lg p-5 mt-4 uppercase">
          {isSubmitting ? 'Guardando...' : 'Actualizar Información'}
        </button>
      </form>
    </div>
  );

  const FormAporteZonaView = () => (
    <div className="bg-white min-h-screen animate-fade-in">
      <div className="bg-red-600 text-white p-4 sticky top-0 flex justify-between items-center shadow-md">
        <h2 className="font-black uppercase">Actualizar Foco</h2>
        <button onClick={() => setView('detail')} className="text-sm font-bold text-red-200">Cancelar</button>
      </div>
      <form onSubmit={handleAportarZona} className="p-4 space-y-5">
        <div>
          <label className="block text-sm font-black uppercase mb-2">Nuevo Nivel de Urgencia</label>
          <div className="grid grid-cols-3 gap-2">
            {['alta', 'media', 'baja'].map(u => (
              <button key={u} type="button" onClick={() => setFormAporteZona({...formAporteZona, urgency: u})} className={`p-3 font-bold uppercase text-xs border-2 ${formAporteZona.urgency === u ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-300'}`}>
                {u}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-black uppercase mb-2">Situación Actual (Evolución)</label>
          <textarea required rows="4" className="w-full p-4 border-2 border-black font-medium focus:outline-none focus:border-red-500 resize-none" value={formAporteZona.situation} onChange={e => setFormAporteZona({...formAporteZona, situation: e.target.value})}></textarea>
        </div>
        <button disabled={isSubmitting} type="submit" className="w-full bg-red-600 text-white font-black text-lg p-5 mt-4 uppercase">
          {isSubmitting ? 'Guardando...' : 'Actualizar Rescatistas'}
        </button>
      </form>
    </div>
  );

  // ─── RENDER PRINCIPAL ───
  return (
    <div
      className="max-w-md mx-auto bg-gray-100 min-h-screen font-sans relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {notification && (
        <div className={`absolute top-0 left-0 right-0 z-50 p-4 animate-slide-down ${notification.isError ? 'bg-red-600' : 'bg-black'} text-white`}>
          <div className="flex items-center gap-3 font-bold text-sm uppercase tracking-wide">
            {notification.isError ? <AlertTriangle size={18}/> : <CheckCircle size={18}/>}
            {notification.msg}
          </div>
        </div>
      )}

      {view === 'home'         && HomeView()}
      {view === 'personas'     && DashboardView({ type: 'personas' })}
      {view === 'zonas'        && DashboardView({ type: 'zonas' })}
      {view === 'detail'       && DetailView()}
      {view === 'form_persona' && FormPersonaView()}
      {view === 'form_zona'    && FormZonaView()}
      {view === 'form_aporte_persona' && FormAportePersonaView()}
      {view === 'form_aporte_zona'    && FormAporteZonaView()}

      {/* MODAL DE ÉXITO BRUTALISTA DE TELEGRAM */}
      {showSuccessModal && selectedItem && (
        <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border-4 border-black p-6 w-full max-w-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4 animate-slide-up">
            <div className="flex items-center gap-2 text-blue-600 font-black uppercase text-lg border-b-4 border-black pb-2">
              <Bell size={24} className="animate-bounce" />
              <span>¡Reporte Creado!</span>
            </div>
            <p className="text-sm font-bold text-gray-800 leading-snug">
              ¿Quieres recibir notificaciones automáticas en tu Telegram si un rescatista o familiar cambia el estado o ubicación de <span className="underline font-black">{selectedItem.name_desc || selectedItem.name}</span>?
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <a 
                href={`https://t.me/red_emergencia_bot?start=${activeTab === 'personas' ? 'person' : 'zone'}_${selectedItem.id}`}
                target="_blank" 
                rel="noopener noreferrer"
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-blue-600 text-white font-black uppercase p-4 hover:bg-blue-700 text-center border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Bell size={16}/> Sí, activar en Telegram
              </a>
              <button 
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-white text-black font-black uppercase p-3 hover:bg-gray-100 text-center border-2 border-black text-xs"
              >
                No, ver en la web
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
        @keyframes slideUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
        .animate-slide-down { animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-slide-up { animation: slideUp 0.25s ease-out forwards; }
      `}} />
    </div>
  );
}