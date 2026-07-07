import { useState } from 'react';
import { Search, Filter, CheckCircle, Wrench, LogIn, LogOut, AlertCircle, X, Trash2, Pencil } from 'lucide-react';
import { useCRM } from '../../context/CRMDataContext';
import { Room } from '../../context/CRMDataContext';
import { toast } from 'sonner';

export default function Rooms() {
  const { rooms, updateRoom, reservations, checkInGuest, checkOutGuest } = useCRM();
  const [searchTerm, setSearchTerm] = useState('');
  // Maintenance Modal State
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [maintenanceNotes, setMaintenanceNotes] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Partial<Room>>({});

  const filteredRooms = rooms.filter(room =>
    room.room_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Find the active reservation for a room for today
  const getActiveReservation = (roomId: number) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return undefined;

    const today = new Date().toISOString().slice(0, 10); // Format today's date as YYYY-MM-DD for comparison

    const activeReservations = reservations.filter(r => {
      // Match by room_id (preferred) OR by room number string
      // Avoid matching generic room types (e.g., 'Standard') to room names if room_id is empty
      const matchesRoom =
        (r.room_id === roomId) ||
        (!r.room_id && r.room === room.room_number) ||
        (!r.room_id && r.room === String(room.room_number)) ||
        (!r.room_id && room.name && r.room === room.name && !['Standard', 'Suite', 'Deluxe'].includes(r.room));

      if (!matchesRoom) return false;
      if (r.status !== 'Confirmed' && r.status !== 'Checked In' && r.status !== 'Pending') return false;

      // Check if reservation dates overlap with today
      const checkInDate = r.checkIn?.slice(0, 10);
      const checkOutDate = r.checkOut?.slice(0, 10);

      return (checkInDate <= today || !checkInDate) &&
        (checkOutDate >= today || !checkOutDate);
    });

    if (activeReservations.length === 0) return undefined;

    // Prioritize Checked In > Confirmed > Pending
    const checkedIn = activeReservations.find(r => r.status === 'Checked In');
    if (checkedIn) return checkedIn;

    const confirmed = activeReservations.find(r => r.status === 'Confirmed');
    if (confirmed) return confirmed;

    // If no 'Checked In' or 'Confirmed', return the first 'Pending' or any other active reservation
    return activeReservations[0];
  };

  const handleCheckIn = async (reservationId: string, explicitRoomId: number) => {
    if (!window.confirm("Check in this guest?")) return;
    try {
      const res = reservations.find(r => r.id === reservationId);
      const roomToUse = explicitRoomId || res?.room_id;
      if (!roomToUse) {
        toast.error("No room assigned to this reservation.");
        return;
      }
      await checkInGuest(reservationId, roomToUse);
      toast.success("Guest checked in successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to check in guest");
    }
  };

  const handleCheckOut = async (reservationId: string, explicitRoomId: number) => {
    if (!window.confirm("Check out this guest? Room will be marked as Dirty.")) return;
    try {
      const res = reservations.find(r => r.id === reservationId);
      const roomToUse = explicitRoomId || res?.room_id;
      if (!roomToUse) return;
      await checkOutGuest(reservationId, roomToUse);
      toast.success("Guest checked out successfully");
    } catch (error) {
      toast.error("Failed to check out guest");
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      await updateRoom(id, { status: status as Room['status'] });
      toast.success(`Room status updated to ${status}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleUpdateCleaning = async (id: number, status: 'Clean' | 'Dirty') => {
    try {
      await updateRoom(id, { cleaning_status: status });
      toast.success(`Room marked as ${status}`);
    } catch (error) {
      toast.error('Failed to update cleaning status');
    }
  };

  const openMaintenanceModal = (room: Room) => {
    setSelectedRoomId(room.id);
    setMaintenanceNotes(room.maintenance_notes || '');
    setIsMaintenanceModalOpen(true);
  };
  const handleSaveMaintenanceNotes = async () => {
    if (selectedRoomId === null) return;
    try {
      await updateRoom(selectedRoomId, { maintenance_notes: maintenanceNotes });
      toast.success('Maintenance notes saved');
      setIsMaintenanceModalOpen(false);
      setSelectedRoomId(null);
    } catch (error) {
      toast.error('Failed to save maintenance notes');
    }
  };

  const openEditModal = (room: Room) => {
    setEditingRoom({ ...room });
    setIsEditModalOpen(true);
  };

  const handleSaveRoomDetails = async () => {
    if (!editingRoom.id) return;
    try {
      await updateRoom(editingRoom.id, editingRoom);
      toast.success('Room details updated');
      setIsEditModalOpen(false);
      setEditingRoom({});
    } catch (error) {
      toast.error('Failed to update room details');
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-gray-900">Room Management</h1>
          <p className="text-gray-500 mt-1">Monitor room status, cleaning, and maintenance.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50">
          <div className="relative w-full sm:w-96">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by Room Number or Type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:border-[var(--color-ocean-500)] focus:ring-2 focus:ring-[var(--color-ocean-100)] outline-none transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm w-full sm:w-auto justify-center">
            <Filter size={16} />
            Filters
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                <th className="p-4 font-semibold">Room Number</th>
                <th className="p-4 font-semibold">Room Type</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Cleaning Status</th>
                <th className="p-4 font-semibold">Current Guest</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-50">
              {filteredRooms.map((room) => {
                const activeRes = getActiveReservation(room.id);
                const guestName = activeRes ? activeRes.guest : null;

                // Derive actual status
                let displayStatus = room.status; // 'Available' or 'Maintenance'
                if (activeRes && room.status !== 'Maintenance') {
                  displayStatus = activeRes.status === 'Checked In' ? 'Occupied' : 'Reserved';
                }

                return (
                  <tr key={room.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="p-4 font-bold text-gray-900 text-lg">{room.room_number || 'N/A'}</td>
                    <td className="p-4 text-gray-600 font-medium">{room.type}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${displayStatus === 'Available' ? 'bg-green-100 text-green-800' :
                        displayStatus === 'Occupied' ? 'bg-blue-100 text-blue-800' :
                          displayStatus === 'Reserved' ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'
                        }`}>
                        {displayStatus}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1 w-fit ${room.cleaning_status === 'Clean' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                          {room.cleaning_status === 'Clean' ? <CheckCircle size={12} /> : <Wrench size={12} />}
                          {room.cleaning_status}
                        </span>
                        {room.maintenance_notes && (
                          <div className="text-xs text-red-600 space-y-1 mt-1 font-medium bg-red-50 p-2 rounded-lg border border-red-100 flex flex-col gap-1 w-fit max-w-[200px]">
                            <span className="flex items-center gap-1 font-bold"><AlertCircle size={10} /> Maintenance Active</span>
                            <p className="italic leading-tight opacity-90 line-clamp-3">{room.maintenance_notes}</p>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-gray-600">
                      {guestName ? (
                        <span className="font-medium text-[var(--color-ocean-900)]">{guestName} <span className="text-xs text-gray-400 ml-1">({activeRes?.id})</span></span>
                      ) : (
                        <span className="text-gray-400 italic">None</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {activeRes && activeRes.status !== 'Checked In' && (
                          <button
                            onClick={() => handleCheckIn(activeRes.id, room.id)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Check In">
                            <LogIn size={18} />
                          </button>
                        )}
                        {activeRes && activeRes.status === 'Checked In' && (
                          <button
                            onClick={() => handleCheckOut(activeRes.id, room.id)}
                            className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Check Out">
                            <LogOut size={18} />
                          </button>
                        )}
                        {room.cleaning_status === 'Dirty' ? (
                          <button
                            onClick={() => handleUpdateCleaning(room.id, 'Clean')}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Mark Clean">
                            <CheckCircle size={18} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdateCleaning(room.id, 'Dirty')}
                            className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors" title="Mark Dirty">
                            <Wrench size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(room)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit Room">
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => openMaintenanceModal(room)}
                          className={`p-1.5 rounded-lg transition-colors ${room.maintenance_notes ? 'text-red-600 hover:bg-red-50' : 'text-gray-400 hover:bg-gray-100'}`}
                          title="Maintenance Notes">
                          <AlertCircle size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

      {/* Maintenance Notes Modal */}
      {isMaintenanceModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Maintenance Issue</h2>
              <button onClick={() => setIsMaintenanceModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Issue Description (e.g., Broken AC, TV not working)</label>
                <textarea
                  value={maintenanceNotes}
                  onChange={(e) => setMaintenanceNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all resize-none h-32"
                  placeholder="Enter maintenance details here. Leave blank to clear active maintenance."
                ></textarea>
              </div>

              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <AlertCircle size={20} className="text-amber-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-900 leading-tight">Room Status</p>
                  <p className="text-[10px] text-amber-700 leading-tight">Marking a room for maintenance hides it from new bookings.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const currentRoom = rooms.find(r => r.id === selectedRoomId);
                    if (currentRoom) {
                      const newStatus = currentRoom.status === 'Maintenance' ? 'Available' : 'Maintenance';
                      handleUpdateStatus(currentRoom.id, newStatus);
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${rooms.find(r => r.id === selectedRoomId)?.status === 'Maintenance'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-amber-600 border border-amber-200 hover:bg-amber-50'
                    }`}
                >
                  {rooms.find(r => r.id === selectedRoomId)?.status === 'Maintenance' ? 'Under Maintenance' : 'Set Maintenace Mode'}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-100 gap-3">
              {rooms.find(r => r.id === selectedRoomId)?.maintenance_notes && (
                <button
                  onClick={async () => {
                    if (selectedRoomId === null) return;
                    if (window.confirm("Clear all maintenance notes for this room?")) {
                      await updateRoom(selectedRoomId, { maintenance_notes: null });
                      setMaintenanceNotes('');
                      setIsMaintenanceModalOpen(false);
                      toast.success('Maintenance notes cleared');
                    }
                  }}
                  className="px-4 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors flex items-center gap-1"
                >
                  <Trash2 size={14} /> Clear Issue
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => setIsMaintenanceModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMaintenanceNotes}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[var(--color-ocean-600)] to-[var(--color-ocean-500)] hover:from-[var(--color-ocean-700)] hover:to-[var(--color-ocean-600)] rounded-xl transition-all shadow-md shadow-[var(--color-ocean-500)]/20 active:scale-[0.98]"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Room Details Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 italic font-serif">Edit Room #{editingRoom.room_number}</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Room Name / Label</label>
                <input
                  type="text"
                  value={editingRoom.name || ''}
                  onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[var(--color-ocean-500)] transition-all outline-none"
                  placeholder="e.g., Ocean View Room"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Room Number</label>
                <input
                  type="text"
                  value={editingRoom.room_number || ''}
                  onChange={(e) => setEditingRoom({ ...editingRoom, room_number: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[var(--color-ocean-500)] transition-all outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Room Type</label>
                <select
                  value={editingRoom.type || ''}
                  onChange={(e) => setEditingRoom({ ...editingRoom, type: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[var(--color-ocean-500)] transition-all outline-none"
                >
                  <option value="Standard">Standard</option>
                  <option value="Deluxe">Deluxe</option>
                  <option value="Suite">Suite</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Price Per Night (₹)</label>
                <input
                  type="number"
                  value={editingRoom.price_per_night || 0}
                  onChange={(e) => setEditingRoom({ ...editingRoom, price_per_night: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[var(--color-ocean-500)] transition-all outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Max Occupancy</label>
                <input
                  type="number"
                  value={editingRoom.max_occupancy || 1}
                  onChange={(e) => setEditingRoom({ ...editingRoom, max_occupancy: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[var(--color-ocean-500)] transition-all outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Operational Status</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingRoom({ ...editingRoom, status: 'Available' })}
                    className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold transition-all ${editingRoom.status === 'Available' ? 'bg-green-100 text-green-700 border-2 border-green-500' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}
                  >
                    Available
                  </button>
                  <button
                    onClick={() => setEditingRoom({ ...editingRoom, status: 'Maintenance' })}
                    className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold transition-all ${editingRoom.status === 'Maintenance' ? 'bg-red-100 text-red-700 border-2 border-red-500' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}
                  >
                    Maintenance
                  </button>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Show on website</label>
                <div className="flex items-center h-[40px]">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={editingRoom.show_on_website !== false}
                      onChange={(e) => setEditingRoom({ ...editingRoom, show_on_website: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-ocean-500)]" />
                    <span className="ml-3 text-sm font-semibold text-gray-650">
                      {editingRoom.show_on_website !== false ? 'Yes, display on public site' : 'No, hide from public site'}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRoomDetails}
                className="px-8 py-2.5 text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-all shadow-lg active:scale-[0.98]"
              >
                Update Room
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
