import React, { useState, useEffect } from 'react';
import {
  Search, Plus, X, Bed, Tv, Wind, Bell, Sofa, Trash2, Edit3, Users,
  Check, AlertCircle, UserPlus, ArrowRightLeft, Bath, DoorClosed, Refrigerator, ShieldAlert
} from 'lucide-react';
import { Room, Resident, RoomStatus } from '../types';
import CustomSelect from './CustomSelect';

interface RoomsModuleProps {
  rooms: Room[];
  residents: Resident[];
  onAddRoom: (room: Room) => Promise<void>;
  onUpdateRoom: (room: Room) => Promise<void>;
  onDeleteRoom?: (roomId: string) => Promise<void>;
  onUpdateResident: (resident: Resident) => Promise<void>;
}

const PREDEFINED_ASSETS = [
  'Televisão',
  'Guarda-roupa',
  'Ar Condicionado',
  'Ventilador',
  'Frigobar',
  'Cama Hospitalar',
  'Banheiro Adaptado',
  'Poltrona Reclinável',
  'Campainha de Emergência'
];

// Helper to return icon for specific asset
const getAssetIcon = (assetName: string) => {
  const name = assetName.toLowerCase();
  if (name.includes('tv') || name.includes('televisão')) return <Tv className="h-3.5 w-3.5" />;
  if (name.includes('ar condicionado') || name.includes('climatizador')) return <Wind className="h-3.5 w-3.5" />;
  if (name.includes('guarda-roupa') || name.includes('armário')) return <DoorClosed className="h-3.5 w-3.5" />;
  if (name.includes('frigobar') || name.includes('geladeira')) return <Refrigerator className="h-3.5 w-3.5" />;
  if (name.includes('banheiro') || name.includes('adaptado')) return <Bath className="h-3.5 w-3.5" />;
  if (name.includes('poltrona') || name.includes('cadeira')) return <Sofa className="h-3.5 w-3.5" />;
  if (name.includes('campainha') || name.includes('emergência')) return <Bell className="h-3.5 w-3.5" />;
  if (name.includes('ventilador')) return <Wind className="h-3.5 w-3.5" />;
  return <ShieldAlert className="h-3.5 w-3.5" />;
};

const RoomsModule: React.FC<RoomsModuleProps> = ({
  rooms,
  residents,
  onAddRoom,
  onUpdateRoom,
  onDeleteRoom,
  onUpdateResident
}) => {
  // Session storage state persistence for persistent modal open
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(() => {
    return localStorage.getItem('modal_rooms_open') === 'true';
  });
  const [editingRoom, setEditingRoom] = useState<Room | null>(() => {
    const saved = localStorage.getItem('modal_rooms_editing');
    return saved ? JSON.parse(saved) : null;
  });

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(() => {
    return localStorage.getItem('modal_link_resident_open') === 'true';
  });
  const [linkingRoom, setLinkingRoom] = useState<Room | null>(() => {
    const saved = localStorage.getItem('modal_link_room');
    return saved ? JSON.parse(saved) : null;
  });

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'Todos' | 'Individual' | 'Compartilhado'>('Todos');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');

  // Room Form State
  const [roomNumber, setRoomNumber] = useState(() => localStorage.getItem('modal_rooms_number') || '');
  const [roomType, setRoomType] = useState<'Individual' | 'Compartilhado'>(() => (localStorage.getItem('modal_rooms_type') as any) || 'Individual');
  const [roomCapacity, setRoomCapacity] = useState(() => Number(localStorage.getItem('modal_rooms_capacity')) || 1);
  const [selectedAssets, setSelectedAssets] = useState<string[]>(() => {
    const saved = localStorage.getItem('modal_rooms_selected_assets');
    return saved ? JSON.parse(saved) : [];
  });
  const [customAsset, setCustomAsset] = useState(() => localStorage.getItem('modal_rooms_custom_asset') || '');
  const [manualStatus, setManualStatus] = useState<RoomStatus | ''>(() => (localStorage.getItem('modal_rooms_manual_status') as any) || '');

  // Save states to session storage to comply with modal persistence
  useEffect(() => {
    localStorage.setItem('modal_rooms_open', isRoomModalOpen.toString());
    localStorage.setItem('modal_rooms_editing', editingRoom ? JSON.stringify(editingRoom) : '');
    localStorage.setItem('modal_link_resident_open', isLinkModalOpen.toString());
    localStorage.setItem('modal_link_room', linkingRoom ? JSON.stringify(linkingRoom) : '');
    localStorage.setItem('modal_rooms_number', roomNumber);
    localStorage.setItem('modal_rooms_type', roomType);
    localStorage.setItem('modal_rooms_capacity', roomCapacity.toString());
    localStorage.setItem('modal_rooms_selected_assets', JSON.stringify(selectedAssets));
    localStorage.setItem('modal_rooms_custom_asset', customAsset);
    localStorage.setItem('modal_rooms_manual_status', manualStatus);
  }, [isRoomModalOpen, editingRoom, isLinkModalOpen, linkingRoom, roomNumber, roomType, roomCapacity, selectedAssets, customAsset, manualStatus]);

  // Sync capacity when room type is changed to individual
  useEffect(() => {
    if (roomType === 'Individual') {
      setRoomCapacity(1);
    } else if (roomCapacity <= 1 && !editingRoom) {
      setRoomCapacity(2);
    }
  }, [roomType]);

  // Clean form state
  const clearForm = () => {
    setRoomNumber('');
    setRoomType('Individual');
    setRoomCapacity(1);
    setSelectedAssets([]);
    setCustomAsset('');
    setManualStatus('');
    localStorage.removeItem('modal_rooms_number');
    localStorage.removeItem('modal_rooms_type');
    localStorage.removeItem('modal_rooms_capacity');
    localStorage.removeItem('modal_rooms_selected_assets');
    localStorage.removeItem('modal_rooms_custom_asset');
    localStorage.removeItem('modal_rooms_manual_status');
    localStorage.removeItem('modal_rooms_open');
    localStorage.removeItem('modal_rooms_editing');
  };

  // Load editing room data into form
  const handleEditRoomClick = (room: Room) => {
    setEditingRoom(room);
    setRoomNumber(room.number);
    setRoomType(room.type);
    setRoomCapacity(room.capacity);
    setSelectedAssets(room.assets);
    setManualStatus(room.status || '');
    setIsRoomModalOpen(true);
  };

  const handleCreateRoomClick = () => {
    setEditingRoom(null);
    setRoomNumber('');
    setRoomType('Individual');
    setRoomCapacity(1);
    setSelectedAssets([]);
    setManualStatus('');
    setIsRoomModalOpen(true);
  };

  const handleCloseRoomModal = () => {
    setIsRoomModalOpen(false);
    setEditingRoom(null);
    clearForm();
  };

  // Submit Room handler
  const handleRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber.trim()) return;

    // Se houver algum texto digitado no campo de patrimônio customizado que não foi adicionado ainda via botão,
    // nós o adicionamos automaticamente antes de salvar.
    let finalAssets = [...selectedAssets];
    const trimmedCustomAsset = customAsset.trim();
    if (trimmedCustomAsset && !finalAssets.includes(trimmedCustomAsset)) {
      finalAssets.push(trimmedCustomAsset);
    }

    const roomData: Room = {
      id: editingRoom?.id || Math.random().toString(36).substr(2, 9),
      number: roomNumber.trim(),
      type: roomType,
      capacity: roomCapacity,
      assets: finalAssets,
      status: manualStatus === '' ? undefined : manualStatus
    };

    try {
      if (editingRoom) {
        await onUpdateRoom(roomData);
      } else {
        // Check uniqueness of number
        if (rooms.some(r => r.number.toLowerCase() === roomNumber.trim().toLowerCase())) {
          alert('Já existe um quarto cadastrado com este número.');
          return;
        }
        await onAddRoom(roomData);
      }
      setEditingRoom(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar o quarto.');
    }
  };

  const toggleAsset = (asset: string) => {
    if (selectedAssets.includes(asset)) {
      setSelectedAssets(selectedAssets.filter(a => a !== asset));
    } else {
      setSelectedAssets([...selectedAssets, asset]);
    }
  };

  const addCustomAsset = () => {
    if (customAsset.trim() && !selectedAssets.includes(customAsset.trim())) {
      setSelectedAssets([...selectedAssets, customAsset.trim()]);
      setCustomAsset('');
    }
  };

  // Resident unlink handler
  const handleUnlinkResident = async (resident: Resident) => {
    if (window.confirm(`Tem certeza que deseja desvincular o residente ${resident.name} deste quarto?`)) {
      const updatedResident: Resident = {
        ...resident,
        room: '', // unlink
        roomStatus: undefined
      };
      await onUpdateResident(updatedResident);
    }
  };

  // Resident link handler
  const handleLinkResidentSubmit = async (residentId: string) => {
    if (!linkingRoom) return;

    const resident = residents.find(r => r.id === residentId);
    if (!resident) return;

    const residentsInRoom = residents.filter(r => r.room === linkingRoom.number);
    if (residentsInRoom.length >= linkingRoom.capacity) {
      alert('Este quarto já está com a capacidade máxima ocupada!');
      return;
    }

    const updatedResident: Resident = {
      ...resident,
      room: linkingRoom.number,
      roomStatus: linkingRoom.status || 'Ocupado'
    };

    try {
      await onUpdateResident(updatedResident);
      // Refresh matching lists
      const updatedResidentsInRoom = [...residentsInRoom, updatedResident];
      // Check if we should update room status automatically if it reaches capacity and room status is not manual
      if (updatedResidentsInRoom.length >= linkingRoom.capacity && !linkingRoom.status) {
        await onUpdateRoom({
          ...linkingRoom,
          status: 'Ocupado'
        });
      }
      setLinkingRoom(null);
    } catch (err) {
      console.error(err);
      alert('Erro ao vincular o residente.');
    }
  };

  // Calculated stats
  const totalRooms = rooms.length;
  const capacityMap = rooms.reduce((acc, r) => {
    const count = residents.filter(res => res.room === r.number).length;
    acc.totalBeds += r.capacity;
    acc.occupiedBeds += count;
    return acc;
  }, { totalBeds: 0, occupiedBeds: 0 });

  // Group residents by room number
  const getResidentsForRoom = (roomNumber: string) => {
    return residents.filter(r => r.room === roomNumber);
  };

  // Compute status for room card
  const getRoomStatusDetails = (room: Room, roomResidents: Resident[]) => {
    // If there is manual override status
    if (room.status === 'Manutenção') {
      return { label: 'Manutenção', color: 'bg-slate-100 text-slate-700 border-slate-300', dot: 'bg-slate-400' };
    }
    if (room.status === 'Em Limpeza') {
      return { label: 'Em Limpeza', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-400' };
    }
    if (room.status === 'Reservado') {
      return { label: 'Reservado', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' };
    }

    const count = roomResidents.length;
    if (count === 0) {
      return { label: 'Vago', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-400' };
    }
    if (count < room.capacity) {
      return { label: `Disponível (${count}/${room.capacity})`, color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-400' };
    }
    return { label: 'Ocupado', color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-400' };
  };

  // Filtered Rooms
  const filteredRooms = rooms.filter(room => {
    const roomResidents = getResidentsForRoom(room.number);
    const statusDetails = getRoomStatusDetails(room, roomResidents);

    // Search filter
    const matchesSearch =
      room.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      roomResidents.some(r => r.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      room.assets.some(a => a.toLowerCase().includes(searchQuery.toLowerCase()));

    // Type filter
    const matchesType = typeFilter === 'Todos' || room.type === typeFilter;

    // Status filter
    let matchesStatus = true;
    if (statusFilter !== 'Todos') {
      if (statusFilter === 'Vago') {
        matchesStatus = roomResidents.length === 0 && room.status !== 'Manutenção' && room.status !== 'Em Limpeza';
      } else if (statusFilter === 'Ocupado') {
        matchesStatus = roomResidents.length >= room.capacity && room.status !== 'Manutenção' && room.status !== 'Em Limpeza';
      } else if (statusFilter === 'Disponível') {
        matchesStatus = roomResidents.length > 0 && roomResidents.length < room.capacity && room.status !== 'Manutenção' && room.status !== 'Em Limpeza';
      } else {
        matchesStatus = room.status === statusFilter;
      }
    }

    return matchesSearch && matchesType && matchesStatus;
  });

  const vacantRoomsCount = rooms.filter(r => getResidentsForRoom(r.number).length === 0 && r.status !== 'Manutenção' && r.status !== 'Em Limpeza').length;
  const maintenanceCount = rooms.filter(r => r.status === 'Manutenção').length;
  const cleaningCount = rooms.filter(r => r.status === 'Em Limpeza').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Gerenciamento de Quartos</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gestão de leitos, patrimônio e alocação de residentes</p>
        </div>
        <button
          id="btn-new-room"
          onClick={handleCreateRoomClick}
          className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-900 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm w-full sm:w-auto justify-center"
        >
          <Plus className="h-4 w-4" /> Novo Quarto
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 p-5 border border-slate-50 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Bed className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Total de Quartos</p>
            <h3 className="text-2xl font-bold text-slate-800">{totalRooms}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 p-5 border border-slate-50 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Leitos Ocupados</p>
            <h3 className="text-2xl font-bold text-slate-800">
              {capacityMap.occupiedBeds} / {capacityMap.totalBeds}
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 p-5 border border-slate-50 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Check className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Quartos Totalmente Vagos</p>
            <h3 className="text-2xl font-bold text-slate-800">{vacantRoomsCount}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 p-5 border border-slate-50 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Limpeza / Manutenção</p>
            <h3 className="text-2xl font-bold text-slate-800">
              {cleaningCount + maintenanceCount} <span className="text-xs text-slate-400 font-normal">({cleaningCount} L / {maintenanceCount} M)</span>
            </h3>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm shadow-blue-100/40 p-4 border border-slate-100/50 flex flex-col md:flex-row gap-4 items-center">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            id="rooms-search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por número, residente ou patrimônio..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters Selects */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-3 py-1 text-xs text-slate-600 border border-slate-100">
            <span className="font-semibold text-slate-400">Tipo:</span>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
              className="bg-transparent border-0 font-medium text-slate-700 py-1 focus:outline-none"
            >
              <option value="Todos">Todos</option>
              <option value="Individual">Individual</option>
              <option value="Compartilhado">Compartilhado</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-3 py-1 text-xs text-slate-600 border border-slate-100">
            <span className="font-semibold text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-transparent border-0 font-medium text-slate-700 py-1 focus:outline-none"
            >
              <option value="Todos">Todos</option>
              <option value="Vago">Vago</option>
              <option value="Disponível">Disponível</option>
              <option value="Ocupado">Ocupado</option>
              <option value="Em Limpeza">Em Limpeza</option>
              <option value="Manutenção">Manutenção</option>
              <option value="Reservado">Reservado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Rooms */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRooms.map(room => {
          const roomResidents = getResidentsForRoom(room.number);
          const status = getRoomStatusDetails(room, roomResidents);

          return (
            <div
              key={room.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              <div className="p-5 space-y-4">
                {/* Room title & badges */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Quarto {room.number}</h3>
                    <span className="inline-flex text-[10px] uppercase tracking-wider font-bold text-slate-400">
                      {room.type} ({room.capacity} leito{room.capacity > 1 ? 's' : ''})
                    </span>
                  </div>

                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 border rounded-full ${status.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                </div>

                {/* Residents in room */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Residentes Vinculados</h4>
                  {roomResidents.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Nenhum residente alocado neste quarto.</p>
                  ) : (
                    <div className="space-y-2">
                      {roomResidents.map(res => (
                        <div key={res.id} className="flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 border border-slate-100/50 rounded-xl p-2 group/item">
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={res.photoUrl || `https://picsum.photos/100/100?random=${res.id}`}
                              alt={res.name}
                              className="w-7 h-7 rounded-lg object-cover"
                            />
                            <span className="text-xs font-bold text-slate-700 truncate">{res.name}</span>
                          </div>
                          <button
                            onClick={() => handleUnlinkResident(res)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors opacity-0 group-hover/item:opacity-100 focus:opacity-100 shrink-0"
                            title="Desvincular do Quarto"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Allocation helper button */}
                  {roomResidents.length < room.capacity && room.status !== 'Manutenção' && (
                    <button
                      onClick={() => {
                        setLinkingRoom(room);
                        setIsLinkModalOpen(true);
                      }}
                      className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-white border border-dashed border-blue-200 hover:border-blue-600 hover:bg-blue-600 rounded-xl px-3 py-1.5 w-full justify-center transition-all select-none"
                    >
                      <UserPlus className="h-3.5 w-3.5" /> Alocar Residente
                    </button>
                  )}
                </div>

                {/* Assets / Patrimonios */}
                <div className="pt-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Patrimônio / Comodidades</h4>
                  {room.assets.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Nenhum patrimônio cadastrado.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {room.assets.map((asset, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] font-semibold px-2 py-1 rounded-lg border border-blue-100/60"
                        >
                          {getAssetIcon(asset)}
                          {asset}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-400">Leitos: {roomResidents.length}/{room.capacity}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditRoomClick(room)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100 bg-white shadow-sm"
                    title="Editar Quarto"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                  {onDeleteRoom && (
                    <button
                      onClick={() => {
                        if (roomResidents.length > 0) {
                          alert('Não é possível excluir um quarto que possua residentes vinculados.');
                          return;
                        }
                        if (window.confirm(`Tem certeza que deseja excluir o Quarto ${room.number}?`)) {
                          onDeleteRoom(room.id);
                        }
                      }}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100 bg-white shadow-sm"
                      title="Excluir Quarto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredRooms.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl shadow-sm border border-slate-100 p-12 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Bed className="h-7 w-7 text-blue-300" />
            </div>
            <p className="text-sm font-semibold text-slate-600">Nenhum quarto encontrado</p>
            <p className="text-xs text-slate-400">Tente ajustar a busca ou os filtros aplicados.</p>
          </div>
        )}
      </div>

      {/* MODAL 1: Add/Edit Room (Persistent) */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white w-full h-full sm:h-auto sm:rounded-2xl shadow-2xl sm:max-w-xl overflow-hidden flex flex-col max-h-[100vh] sm:max-h-[90vh]"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0 bg-white">
              <div>
                <h3 className="font-bold text-slate-900">{editingRoom ? 'Editar Quarto' : 'Novo Quarto'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Preencha as informações básicas do quarto</p>
              </div>
              <button onClick={handleCloseRoomModal} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors">
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleRoomSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Número/Nome do Quarto</label>
                  <input
                    required
                    type="text"
                    value={roomNumber}
                    onChange={e => setRoomNumber(e.target.value)}
                    placeholder="Ex: 101"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tipo do Quarto</label>
                  <CustomSelect
                    value={roomType}
                    onChange={v => setRoomType(v as any)}
                    options={[
                      { value: 'Individual', label: 'Individual', desc: '1 Leito' },
                      { value: 'Compartilhado', label: 'Compartilhado', desc: 'Múltiplos leitos' },
                    ]}
                  />
                </div>
              </div>

              {roomType === 'Compartilhado' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Capacidade de Leitos (Vagas)</label>
                  <input
                    type="number"
                    min={2}
                    max={10}
                    value={roomCapacity}
                    onChange={e => setRoomCapacity(Math.max(2, parseInt(e.target.value) || 2))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Status override */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Intervenção / Status Especial (Opcional)</label>
                <CustomSelect
                  value={manualStatus}
                  onChange={v => setManualStatus(v as any)}
                  options={[
                    { value: '', label: 'Calcular por ocupação', desc: 'Dinâmico: Vago, Disponível ou Ocupado' },
                    { value: 'Em Limpeza', label: 'Em Limpeza', badge: { label: 'Em Limpeza', bg: 'bg-indigo-50', text: 'text-indigo-700' } },
                    { value: 'Manutenção', label: 'Manutenção', badge: { label: 'Manutenção', bg: 'bg-slate-100', text: 'text-slate-700' } },
                    { value: 'Reservado', label: 'Reservado', badge: { label: 'Reservado', bg: 'bg-amber-50', text: 'text-amber-700' } },
                  ]}
                />
                <p className="text-[10px] text-slate-400 mt-1">Status calculados automaticamente por padrão: "Vago", "Disponível" ou "Ocupado".</p>
              </div>

              {/* Assets Section */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Patrimônio & Comodidades</label>

                {/* Predefined checkboxes grid */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-100 rounded-xl p-3 max-h-48 overflow-y-auto">
                  {PREDEFINED_ASSETS.map(asset => (
                    <label key={asset} className="flex items-center gap-2 cursor-pointer select-none py-1">
                      <input
                        type="checkbox"
                        checked={selectedAssets.includes(asset)}
                        onChange={() => toggleAsset(asset)}
                        className="rounded text-blue-600 focus:ring-blue-500 h-4.5 w-4.5 border-slate-300"
                      />
                      <span className="text-xs text-slate-700 font-medium">{asset}</span>
                    </label>
                  ))}
                </div>

                {/* Add Custom asset input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Outro patrimônio... Ex: Frigobar"
                    value={customAsset}
                    onChange={e => setCustomAsset(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomAsset();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addCustomAsset}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors border border-slate-200"
                  >
                    Adicionar
                  </button>
                </div>

                {/* Selected Custom assets indicators */}
                {selectedAssets.filter(a => !PREDEFINED_ASSETS.includes(a)).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedAssets.filter(a => !PREDEFINED_ASSETS.includes(a)).map(a => (
                      <span key={a} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-slate-200">
                        {a}
                        <button type="button" onClick={() => toggleAsset(a)} className="hover:text-rose-500">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseRoomModal}
                  className="flex-1 sm:flex-none px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors"
                >
                  Salvar Quarto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Link Resident to Room (Persistent) */}
      {isLinkModalOpen && linkingRoom && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white w-full h-full sm:h-auto sm:rounded-2xl shadow-2xl sm:max-w-md overflow-hidden flex flex-col max-h-[100vh] sm:max-h-[85vh]"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0 bg-white">
              <div>
                <h3 className="font-bold text-slate-900">Alocar Residente no Quarto {linkingRoom.number}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Selecione o residente para vincular ao leito</p>
              </div>
              <button
                onClick={() => {
                  setIsLinkModalOpen(false);
                  setLinkingRoom(null);
                }}
                className="w-9 h-9 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-4 max-h-[60vh]">
              {/* Residents selection list */}
              <div className="space-y-2.5">
                {residents
                  .filter(res => res.room !== linkingRoom.number)
                  .map(res => {
                    const currentRoomName = res.room ? `Quarto ${res.room}` : 'Sem Quarto';
                    return (
                      <div
                        key={res.id}
                        className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-100 hover:border-blue-100 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={res.photoUrl}
                            alt={res.name}
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-800">{res.name}</p>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              {res.room ? <ArrowRightLeft className="h-3 w-3 text-amber-500" /> : <Check className="h-3 w-3 text-emerald-500" />}
                              Atual: {currentRoomName}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleLinkResidentSubmit(res.id)}
                          className="flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-white hover:bg-blue-600 hover:text-white border border-blue-100 hover:border-blue-600 rounded-xl px-3 py-1.5 transition-all shadow-sm"
                        >
                          Vincular
                        </button>
                      </div>
                    );
                  })}

                {residents.filter(res => res.room !== linkingRoom.number).length === 0 && (
                  <p className="text-center text-xs text-slate-400 italic py-6">Nenhum residente disponível para alocação.</p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 shrink-0 bg-slate-50">
              <button
                onClick={() => {
                  setIsLinkModalOpen(false);
                  setLinkingRoom(null);
                }}
                className="w-full py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-sm rounded-xl transition-all"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomsModule;
