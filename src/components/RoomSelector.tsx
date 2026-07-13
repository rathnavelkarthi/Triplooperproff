import { Users, Wind, Wifi, Bath } from 'lucide-react';
import { motion } from 'motion/react';
import posthog from 'posthog-js';
import { useCRM } from '../context/CRMDataContext';
import { useOccupancyPricing } from '../hooks/useOccupancyPricing';

interface RoomSelectorProps {
  selectedRoomId: string | null;
  onSelectRoom: (room: any) => void;
  nights: number;
}

export default function RoomSelector({ selectedRoomId, onSelectRoom, nights }: RoomSelectorProps) {
  const { rooms: backendRooms } = useCRM();
  const { adjustedPrice } = useOccupancyPricing();

  // Filter only available rooms to show customers
  const availableRooms = backendRooms.filter(r => r.is_available);

  return (
    <div className="space-y-6">
      <h2 className="font-serif text-3xl text-[var(--color-ocean-900)] font-bold mb-6">Select Your Room</h2>

      <div className="grid grid-cols-1 gap-6">
        {availableRooms.map((room, index) => {
          const isSelected = selectedRoomId === String(room.id);
          const bgImage = room.images && room.images.length > 0 ? room.images[0] : 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?q=80&w=2070&auto=format&fit=crop';

          return (
            <motion.div
              key={room.id}
              className={`bg-white rounded-2xl overflow-hidden shadow-sm border-2 transition-all duration-300 flex flex-col sm:flex-row group cursor-pointer
                ${isSelected ? 'border-[var(--color-ocean-500)] ring-4 ring-[var(--color-ocean-50)]' : 'border-transparent hover:border-gray-200 hover:shadow-md'}`}
              onClick={() => {
                posthog.capture('room_selected', {
                  room_id: String(room.id),
                  room_name: room.name,
                  price_per_night: adjustedPrice(room.price_per_night),
                  nights,
                });
                onSelectRoom({ id: String(room.id), name: room.name, price: adjustedPrice(room.price_per_night) });
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
            >
              {/* Image */}
              <div className="w-full sm:w-1/3 h-48 sm:h-auto relative overflow-hidden bg-gray-100">
                <img
                  src={bgImage}
                  alt={room.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Content */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-serif text-2xl font-bold text-gray-900">{room.name}</h3>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Users size={16} className="text-[var(--color-ocean-500)]" />
                      <span>{room.max_occupancy} Guests</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 mb-6 text-gray-500">
                    <Wind size={18} title="AC" className="mr-2" />
                    <Wifi size={18} title="Free WiFi" className="mr-2" />
                    <Bath size={18} title="Attached Bath" className="mr-2" />
                    {room.amenities && room.amenities.map((amenity, idx) => (
                      <span key={idx} className="bg-gray-100/50 text-gray-500 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md mt-1">
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                  <div>
                    <span className="text-2xl font-bold text-gray-900">₹{adjustedPrice(room.price_per_night)}</span>
                    <span className="text-sm text-gray-500"> / night</span>
                    {nights > 0 && (
                      <div className="text-sm font-medium text-[var(--color-ocean-600)] mt-1">
                        Total: ₹{adjustedPrice(room.price_per_night) * nights} for {nights} night{nights > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>

                  <button
                    className={`px-6 py-2.5 rounded-xl font-medium transition-colors
                      ${isSelected
                        ? 'bg-[var(--color-ocean-50)] text-[var(--color-ocean-700)] border border-[var(--color-ocean-200)]'
                        : 'bg-[var(--color-ocean-600)] hover:bg-[var(--color-ocean-800)] text-white shadow-sm'}`}
                  >
                    {isSelected ? 'Selected' : 'Select'}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
        {availableRooms.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-white border border-gray-200 rounded-2xl border-dashed">
            <p>No rooms currently available for booking.</p>
          </div>
        )}
      </div>
    </div>
  );
}
