import React, { useState, useEffect, useCallback } from 'react';
import { Search, User, Map, AlertTriangle, CheckCircle, Home, Clock, ShieldCheck, Plus, MapPin, RefreshCw, Edit3 } from 'lucide-react';

// --- CREDENCIALES REALES SUPABASE ---
const SUPABASE_URL = 'https://mtbtgkzwaukqkayxfwqn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10YnRna3p3YXVrcWtheXhmd3FuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNTMzMzUsImV4cCI6MjA5NzkyOTMzNX0.Hhm8kNtc5AU9mg37n8bAT2W7iA9HnaK4KD5F69vYkdI';

const HEADERS = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// --- COMPONENTES UI AUXILIARES (Fuera de App para evitar parpadeos) ---
const TrustBadge = ({ level }) => {
  if (level >= 3) return <span className="bg-blue-600 text-white text-[10px] px-2 py-1 font-bold uppercase tracking-wider flex items-center gap-1 w-max"><ShieldCheck size={12}/> Oficial</span>;
  if (level === 2) return <span className="bg-green-600 text-white text-[10px] px-2 py-1 font-bold uppercase tracking-wider flex items-center gap-1 w-max"><ShieldCheck size={12}/> Rescate</span>;
  if (level === 1) return <span className="bg-yellow-500 text-black text-[10px] px-2 py-1 font-bold uppercase tracking-wider flex items-center gap-1 w-max"><User size={12}/> Familiar</span>;
  return <span className="bg-gray-200 text-gray-600 text-[10px] px-2 py-1 font-bold uppercase tracking-wider flex items-center gap-1 w-max"><AlertTriangle size={12}/> Civil (Nivel 0)</span>;
};

const StatusPill = ({ status }) => {
  const s = status ? status.toLowerCase() : '';
  let bg = 'bg-gray-800';
  if (s === 'buscado') bg = 'bg-red-600';
  if (s === 'a_salvo') bg = 'bg-green-600';
  if (s === 'herido') bg = 'bg-orange-500';
  if (s === 'fallecido') bg = 'bg-black text-white border border-gray-600';
  
  return <span className={`${bg} text-white text-xs px-2 py-1 font-bold uppercase tracking-wide`}>{status.replace('_', ' ')}</span>;
};

export default function App() {
  const [view, setView] = useState('home'); 
  const [activeTab, setActiveTab] = useState('personas');
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState(null);
  
  // Estado de Datos y Sincronización
  const [incidentId, setIncidentId] = useState(null);
  const [personas, setPersonas] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Formularios de Creación
  const [formPersona, setFormPersona] = useState({ nombreDesc: '', estado: 'buscado', ubicacion: '', contacto: '' });
  const [formZona, setFormZona] = useState({ nombre: '', situacion: '', urgencia: 'alta', contacto: '' });

  // Formularios de Aporte (Edición)
  const [formAportePersona, setFormAportePersona] = useState({ status: '', location_text: '' });
  const [formAporteZona, setFormAporteZona] = useState({ urgency: '', situation: '' });

  // 1. Inicializar
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

  // 2. Obtener Datos
  const fetchData = useCallback(async (silent = false) => {
    if (!incidentId) return;
    if (!silent) setIsLoading(true);
    setIsSyncing(true);

    try {
      const [resP, resZ] = await Promise.all([
        fetch(`${SUPABASE_URL}/rest/v1/persons?incident_id=eq.${incidentId}&order=created_at.desc`, { headers: HEADERS }),
        fetch(`${SUPABASE_URL}/rest/v1/zones?incident_id=eq.${incidentId}&order=created_at.desc`, { headers: HEADERS })
      ]);
      setPersonas(await resP.json() || []);
      setZonas(await resZ.json() || []);
    } catch (err) {
      console.error("Error obteniendo datos:", err);
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, [incidentId]);

  useEffect(() => { if (incidentId) fetchData(); }, [incidentId, fetchData]);

  // 3. Polling
  useEffect(() => {
    if (!incidentId) return;
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, [incidentId, fetchData]);

  const showNotification = (msg, isError = false) => {
    setNotification({ msg, isError });
    setTimeout(() => setNotification(null), 4000);
  };

  // 4. Lógica de Formularios (Crear)
  const handleSubmitPersona = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = { incident_id: incidentId, name_desc: formPersona.nombreDesc, status: formPersona.estado, location_text: formPersona.ubicacion, reporter_contact: formPersona.contacto, trust_level: 0 };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/persons`, { method: 'POST', headers: HEADERS, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      const newData = await res.json();
      setPersonas([newData[0], ...personas]);
      setFormPersona({ nombreDesc: '', estado: 'buscado', ubicacion: '', contacto: '' });
      showNotification("Reporte publicado exitosamente");
      setView('personas');
    } catch { showNotification("Error de red.", true); } finally { setIsLoading(false); }
  };

  const handleSubmitZona = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = { incident_id: incidentId, name: formZona.nombre, urgency: formZona.urgencia, situation: formZona.situacion, reporter_contact: formZona.contacto, trust_level: 0 };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/zones`, { method: 'POST', headers: HEADERS, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();
      const newData = await res.json();
      setZonas([newData[0], ...zonas]);
      setFormZona({ nombre: '', situacion: '', urgencia: 'alta', contacto: '' });
      showNotification("Foco de rescate reportado");
      setView('zonas');
    } catch { showNotification("Error de red.", true); } finally { setIsLoading(false); }
  };

  // 5. Lógica de Formularios (Actualizar - Aportar Info)
  const handleAportarPersona = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/persons?id=eq.${selectedItem.id}`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify(formAportePersona)
      });
      if (!res.ok) throw new Error();
      const updatedData = await res.json();
      const updatedRecord = updatedData[0];
      
      setPersonas(personas.map(p => p.id === updatedRecord.id ? updatedRecord : p));
      setSelectedItem(updatedRecord);
      showNotification("Información actualizada correctamente");
      setView('detail');
    } catch { showNotification("Error al actualizar.", true); } finally { setIsLoading(false); }
  };

  const handleAportarZona = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/zones?id=eq.${selectedItem.id}`, {
        method: 'PATCH',
        headers: HEADERS,
        body: JSON.stringify(formAporteZona)
      });
      if (!res.ok) throw new Error();
      const updatedData = await res.json();
      const updatedRecord = updatedData[0];
      
      setZonas(zonas.map(z => z.id === updatedRecord.id ? updatedRecord : z));
      setSelectedItem(updatedRecord);
      showNotification("Información actualizada correctamente");
      setView('detail');
    } catch { showNotification("Error al actualizar.", true); } finally { setIsLoading(false); }
  };

  // --- VISTAS DIRECTAS (Funciones que devuelven JSX para evitar pérdida de foco) ---
  const renderHome = () => (
    <div className="flex flex-col h-full gap-4 animate-fade-in">
      <div className="bg-black text-white p-6 pb-8">
        <div className="flex justify-between items-start">
          <h2 className="text-3xl font-black uppercase tracking-tight mb-2 leading-none">Sistema de<br/>Respuesta</h2>
          {isSyncing && <RefreshCw size={16} className="animate-spin text-gray-500" />}
        </div>
        <p className="text-gray-400 text-sm font-medium mt-1">Conectado al Incidente Activo. Seleccione módulo.</p>
      </div>

      <div className="px-4 flex flex-col gap-4 -mt-6">
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
            <h3 className="text-2xl font-black uppercase">Focos de Rescate</h3>
            <span className="bg-white text-red-600 text-xs px-2 py-1 font-black">{zonas.length} regs</span>
          </div>
          <p className="text-left text-sm text-red-100 font-medium">Reportar edificios colapsados, deslaves o familias aisladas.</p>
        </button>
      </div>
    </div>
  );

  const renderDashboard = (type) => {
    const isPersonas = type === 'personas';
    const data = isPersonas ? personas : zonas;
    const filtered = data.filter(item => {
      if (!searchQuery) return true;
      const searchStr = isPersonas ? item.name_desc : item.name;
      return searchStr.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
      <div className="flex flex-col h-full animate-fade-in">
        <div className="bg-black p-4 sticky top-0 z-10 flex flex-col gap-3 shadow-lg">
          <div className="flex justify-between items-center text-white">
            <h2 className="text-xl font-black uppercase flex items-center gap-2">
              {isPersonas ? <User size={20}/> : <Map size={20}/>} {isPersonas ? 'Personas' : 'Focos Rescate'}
            </h2>
            <div className="flex items-center gap-3">
              {isSyncing && <RefreshCw size={14} className="animate-spin text-gray-500" />}
              <button onClick={() => setView('home')} className="text-sm font-bold bg-white text-black px-3 py-1 hover:bg-gray-200">Volver</button>
            </div>
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder={isPersonas ? "Buscar nombre (Búsqueda difusa)..." : "Buscar sector o edificio..."} className="w-full p-3 text-black font-medium focus:outline-none rounded-none" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <button onClick={() => setView(isPersonas ? 'form_persona' : 'form_zona')} className="w-full bg-blue-600 text-white font-bold p-3 uppercase tracking-wide hover:bg-blue-700 flex justify-center items-center gap-2">
            <Plus size={18}/> {isPersonas ? 'Crear Reporte de Persona' : 'Reportar Nuevo Foco'}
          </button>
        </div>

        <div className="p-4 space-y-4 bg-gray-100 min-h-screen">
          {isLoading && !personas.length && !zonas.length ? (
            <p className="text-center font-bold text-gray-500 py-10 animate-pulse">Cargando base de datos...</p>
          ) : (
            <>
              {filtered.map(item => (
                <div key={item.id} onClick={() => { setSelectedItem(item); setView('detail'); setActiveTab(type); }} className="bg-white border-2 border-black p-4 cursor-pointer active:scale-[0.98] transition-transform">
                  <div className="flex justify-between items-start mb-3">
                    <TrustBadge level={item.trust_level} />
                    {isPersonas && <StatusPill status={item.status} />}
                    {!isPersonas && <span className={`text-xs px-2 py-1 font-bold uppercase text-white ${item.urgency === 'alta' ? 'bg-red-600' : (item.urgency === 'media' ? 'bg-orange-500' : 'bg-blue-500')}`}>
                      {item.urgency === 'alta' ? 'Vidas en Peligro' : (item.urgency === 'media' ? 'Aislados' : 'Afectado')}
                    </span>}
                  </div>
                  <h3 className="text-lg font-black leading-tight mb-2 uppercase">{isPersonas ? item.name_desc : item.name}</h3>
                  <p className="text-sm text-gray-700 font-medium line-clamp-2"><MapPin size={14} className="inline mr-1 -mt-1"/>{isPersonas ? item.location_text : item.situation}</p>
                </div>
              ))}
              {filtered.length === 0 && <p className="text-center font-bold text-gray-500 py-10">No hay registros aún.</p>}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderDetail = () => {
    if (!selectedItem) return null;
    const isPersona = activeTab === 'personas';

    return (
      <div className="bg-gray-100 min-h-screen animate-fade-in pb-20">
        <div className="bg-black text-white p-4 sticky top-0 flex justify-between items-center z-10 shadow-lg">
          <button onClick={() => setView(activeTab)} className="font-bold flex items-center gap-1 hover:text-gray-300">← Volver</button>
          <span className="text-xs font-mono font-bold opacity-50 truncate w-32 text-right">{selectedItem.id.split('-')[0]}</span>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-white border-4 border-black p-5">
            <div className="flex flex-col items-start gap-3 mb-4">
              <TrustBadge level={selectedItem.trust_level} />
              {isPersona ? <StatusPill status={selectedItem.status} /> : <span className={`text-xs px-2 py-1 font-bold uppercase text-white ${selectedItem.urgency === 'alta' ? 'bg-red-600' : 'bg-orange-500'}`}>{selectedItem.urgency === 'alta' ? 'Vidas en Peligro' : 'Aislados'}</span>}
            </div>
            
            <h2 className="text-2xl font-black uppercase mb-4 leading-tight border-b-2 border-gray-100 pb-4">
              {isPersona ? selectedItem.name_desc : selectedItem.name}
            </h2>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{isPersona ? 'Última Ubicación Conocida' : 'Situación de Rescate'}</p>
                <p className="font-medium text-lg leading-snug">{isPersona ? selectedItem.location_text : selectedItem.situation}</p>
              </div>
              <div className="bg-gray-50 p-3 border border-gray-200">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Contacto Inicial</p>
                <p className="font-bold">{selectedItem.reporter_contact}</p>
              </div>
            </div>
          </div>

          <button 
            onClick={() => {
              if (isPersona) {
                setFormAportePersona({ status: selectedItem.status, location_text: selectedItem.location_text });
                setView('form_aporte_persona');
              } else {
                setFormAporteZona({ urgency: selectedItem.urgency, situation: selectedItem.situation });
                setView('form_aporte_zona');
              }
            }}
            className="w-full bg-black text-white font-black uppercase p-4 hover:bg-gray-800 flex items-center justify-center gap-2"
          >
            <Edit3 size={18}/> Aportar Nueva Información
          </button>
        </div>
      </div>
    );
  };

  const renderFormAportePersona = () => (
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
          <label className="block text-sm font-black uppercase mb-2">Ubicación Actualizada</label>
          <input required type="text" className="w-full p-4 border-2 border-black font-medium focus:outline-none" value={formAportePersona.location_text} onChange={e => setFormAportePersona({...formAportePersona, location_text: e.target.value})} />
        </div>
        <button disabled={isLoading} type="submit" className="w-full bg-blue-600 text-white font-black text-lg p-5 mt-4 uppercase">
          {isLoading ? 'Guardando...' : 'Actualizar Información'}
        </button>
      </form>
    </div>
  );

  const renderFormAporteZona = () => (
    <div className="bg-white min-h-screen animate-fade-in">
      <div className="bg-red-600 text-white p-4 sticky top-0 flex justify-between items-center shadow-md">
        <h2 className="font-black uppercase">Actualizar Foco</h2>
        <button onClick={() => setView('detail')} className="text-sm font-bold text-red-200">Cancelar</button>
      </div>
      <form onSubmit={handleAportarZona} className="p-4 space-y-5">
        <div>
          <label className="block text-sm font-black uppercase mb-2">Nuevo Nivel de Urgencia</label>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => setFormAporteZona({...formAporteZona, urgency: 'alta'})} className={`p-3 font-bold uppercase text-xs border-2 ${formAporteZona.urgency === 'alta' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-300'}`}>Vidas en Peligro (Atrapados)</button>
            <button type="button" onClick={() => setFormAporteZona({...formAporteZona, urgency: 'media'})} className={`p-3 font-bold uppercase text-xs border-2 ${formAporteZona.urgency === 'media' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-300'}`}>Familias Aisladas / Sin Salida</button>
            <button type="button" onClick={() => setFormAporteZona({...formAporteZona, urgency: 'baja'})} className={`p-3 font-bold uppercase text-xs border-2 ${formAporteZona.urgency === 'baja' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-300'}`}>Zona Afectada (Sin heridos)</button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-black uppercase mb-2">Situación Actual (Evolución)</label>
          <textarea required rows="4" className="w-full p-4 border-2 border-black font-medium focus:outline-none resize-none" value={formAporteZona.situation} onChange={e => setFormAporteZona({...formAporteZona, situation: e.target.value})}></textarea>
        </div>
        <button disabled={isLoading} type="submit" className="w-full bg-red-600 text-white font-black text-lg p-5 mt-4 uppercase">
          {isLoading ? 'Guardando...' : 'Actualizar Rescatistas'}
        </button>
      </form>
    </div>
  );

  const renderFormPersona = () => (
    <div className="bg-white min-h-screen animate-fade-in">
      <div className="bg-black text-white p-4 sticky top-0 flex justify-between items-center shadow-md">
        <h2 className="font-black uppercase">Reporte: Persona</h2>
        <button onClick={() => setView('personas')} className="text-sm font-bold text-gray-400">Cancelar</button>
      </div>
      <form onSubmit={handleSubmitPersona} className="p-4 space-y-5">
        <div><label className="block text-sm font-black uppercase mb-2">1. Nombre o Descripción *</label><input required type="text" placeholder="Ej: Luis, o Niño de camisa roja" className="w-full p-4 border-2 border-black font-medium focus:outline-none" value={formPersona.nombreDesc} onChange={e => setFormPersona({...formPersona, nombreDesc: e.target.value})} /></div>
        <div>
          <label className="block text-sm font-black uppercase mb-2">2. Estado Actual *</label>
          <div className="grid grid-cols-2 gap-2">
            {['buscado', 'a_salvo', 'herido', 'fallecido'].map(s => (<button key={s} type="button" onClick={() => setFormPersona({...formPersona, estado: s})} className={`p-3 font-bold uppercase text-xs border-2 ${formPersona.estado === s ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-300'}`}>{s.replace('_', ' ')}</button>))}
          </div>
        </div>
        <div><label className="block text-sm font-black uppercase mb-2">3. Ubicación (Última vista o actual) *</label><input required type="text" placeholder="Sector, calle, o refugio" className="w-full p-4 border-2 border-black font-medium focus:outline-none" value={formPersona.ubicacion} onChange={e => setFormPersona({...formPersona, ubicacion: e.target.value})} /></div>
        <div><label className="block text-sm font-black uppercase mb-2">4. Tu Teléfono (Para Rescatistas) *</label><input required type="text" placeholder="0412-1234567" className="w-full p-4 border-2 border-black font-medium focus:outline-none font-mono" value={formPersona.contacto} onChange={e => setFormPersona({...formPersona, contacto: e.target.value})} /></div>
        <button disabled={isLoading} type="submit" className="w-full bg-blue-600 text-white font-black text-lg p-5 mt-4 uppercase">{isLoading ? 'Guardando...' : 'Publicar Reporte'}</button>
      </form>
    </div>
  );

  const renderFormZona = () => (
    <div className="bg-white min-h-screen animate-fade-in">
      <div className="bg-red-600 text-white p-4 sticky top-0 flex justify-between items-center shadow-md">
        <h2 className="font-black uppercase">Reportar Foco de Rescate</h2>
        <button onClick={() => setView('zonas')} className="text-sm font-bold text-red-200">Cancelar</button>
      </div>
      <form onSubmit={handleSubmitZona} className="p-4 space-y-5">
        <div><label className="block text-sm font-black uppercase mb-2">1. Nombre del Edificio / Sector *</label><input required type="text" placeholder="Ej: Edificio Mijagual" className="w-full p-4 border-2 border-black font-medium focus:outline-none" value={formZona.nombre} onChange={e => setFormZona({...formZona, nombre: e.target.value})} /></div>
        <div>
          <label className="block text-sm font-black uppercase mb-2">2. Nivel de Peligro *</label>
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => setFormZona({...formZona, urgencia: 'alta'})} className={`p-3 font-bold uppercase text-xs border-2 ${formZona.urgency === 'alta' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-300'}`}>Vidas en Peligro (Atrapados)</button>
            <button type="button" onClick={() => setFormZona({...formZona, urgencia: 'media'})} className={`p-3 font-bold uppercase text-xs border-2 ${formZona.urgency === 'media' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-300'}`}>Familias Aisladas / Sin Salida</button>
            <button type="button" onClick={() => setFormZona({...formZona, urgencia: 'baja'})} className={`p-3 font-bold uppercase text-xs border-2 ${formZona.urgency === 'baja' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-300'}`}>Zona Afectada (Sin heridos)</button>
          </div>
        </div>
        <div><label className="block text-sm font-black uppercase mb-2">3. Situación (Describa la emergencia) *</label><textarea required rows="4" placeholder="Ej: Edificio colapsado, personas atrapadas en el sótano." className="w-full p-4 border-2 border-black font-medium focus:outline-none resize-none" value={formZona.situacion} onChange={e => setFormZona({...formZona, situacion: e.target.value})}></textarea></div>
        <div><label className="block text-sm font-black uppercase mb-2">4. Tu Teléfono (Para Rescatistas) *</label><input required type="text" placeholder="0414-1234567" className="w-full p-4 border-2 border-black font-medium focus:outline-none font-mono" value={formZona.contacto} onChange={e => setFormZona({...formZona, contacto: e.target.value})} /></div>
        <button disabled={isLoading} type="submit" className="w-full bg-red-600 text-white font-black text-lg p-5 mt-4 uppercase">{isLoading ? 'Alertar a Rescatistas' : 'Alertar a Rescatistas'}</button>
      </form>
    </div>
  );

  return (
    <div className="max-w-md mx-auto bg-gray-100 min-h-screen font-sans relative overflow-hidden">
      {notification && (
        <div className={`absolute top-0 left-0 right-0 z-50 p-4 animate-slide-down ${notification.isError ? 'bg-red-600 text-white' : 'bg-black text-white'}`}>
          <div className="flex items-center gap-3 font-bold text-sm uppercase tracking-wide">
            {notification.isError ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
            {notification.msg}
          </div>
        </div>
      )}

      {view === 'home' && renderHome()}
      {view === 'personas' && renderDashboard('personas')}
      {view === 'zonas' && renderDashboard('zonas')}
      {view === 'detail' && renderDetail()}
      {view === 'form_persona' && renderFormPersona()}
      {view === 'form_zona' && renderFormZona()}
      {view === 'form_aporte_persona' && renderFormAportePersona()}
      {view === 'form_aporte_zona' && renderFormAporteZona()}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.15s ease-out forwards; }
        .animate-slide-down { animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}} />
    </div>
  );
}