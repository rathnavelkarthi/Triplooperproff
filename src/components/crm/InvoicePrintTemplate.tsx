import { forwardRef } from 'react';

export interface InvoiceData {
    invoiceNumber: string;
    date: string;
    guestName: string;
    guestPhone?: string;
    guestEmail?: string;
    guestLocation?: string;
    bookingId: string;
    room: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    ratePerNight: number;
    subtotal: number;
    gstAmount: number;
    totalAmount: number;
    paymentMethod?: string;
    paymentStatus?: string;
    hotelName?: string;
    hotelAddress?: string;
    hotelEmail?: string;
    hotelPhone?: string;
}

interface Props {
    data: InvoiceData;
}

const InvoicePrintTemplate = forwardRef<HTMLDivElement, Props>(({ data }, ref) => {
    return (
        <div
            ref={ref}
            className="invoice-print-area bg-white p-8 sm:p-12 w-full max-w-2xl"
            style={{ backgroundColor: '#ffffff', color: '#1f2937' }}
        >
            {/* Header */}
            <div className="flex justify-between items-start border-b border-gray-200 pb-8 mb-8">
                <div>
                    <h1 className="font-serif text-3xl font-bold text-[#0c4a6e] leading-tight mb-2">
                        {data.hotelName || 'Triplooper Resort'}
                    </h1>
                    <p className="text-gray-500 text-sm whitespace-pre-wrap">{data.hotelAddress || 'Hotel Address'}</p>
                    <p className="text-gray-500 text-sm">{data.hotelEmail || 'contact@hotel.com'}</p>
                    <p className="text-gray-500 text-sm">{data.hotelPhone || '+91 0000 0000'}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-2xl font-bold text-gray-900 tracking-wider mb-2">INVOICE</h2>
                    <p className="text-gray-600 text-sm font-medium">
                        Inv. No: <span className="font-normal">{data.invoiceNumber}</span>
                    </p>
                    <p className="text-gray-600 text-sm font-medium">
                        Date: <span className="font-normal">{data.date}</span>
                    </p>
                    <p className="text-gray-600 text-sm font-medium">
                        Booking: <span className="font-normal">{data.bookingId}</span>
                    </p>
                </div>
            </div>

            {/* Bill To */}
            <div className="mb-10">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Bill To</p>
                <h3 className="text-lg font-bold text-gray-900">{data.guestName}</h3>
                {data.guestLocation && <p className="text-gray-600 text-sm mt-1">{data.guestLocation}</p>}
                {data.guestPhone && <p className="text-gray-600 text-sm">{data.guestPhone}</p>}
                {data.guestEmail && <p className="text-gray-600 text-sm">{data.guestEmail}</p>}
            </div>

            {/* Items Table */}
            <table className="w-full mb-10 border-collapse">
                <thead>
                    <tr className="border-b-2 border-gray-900 text-gray-900 text-sm">
                        <th className="py-3 text-left font-bold w-1/2">Description</th>
                        <th className="py-3 text-center font-bold">Nights</th>
                        <th className="py-3 text-right font-bold">Rate/Night</th>
                        <th className="py-3 text-right font-bold w-1/4">Amount</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    <tr className="border-b border-gray-100">
                        <td className="py-4 text-gray-900">
                            <p className="font-semibold">{data.room}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                {data.checkIn} to {data.checkOut}
                            </p>
                        </td>
                        <td className="py-4 text-center text-gray-600">{data.nights}</td>
                        <td className="py-4 text-right text-gray-600">
                            ₹{data.ratePerNight.toLocaleString('en-IN')}
                        </td>
                        <td className="py-4 text-right font-medium text-gray-900">
                            ₹{data.subtotal.toLocaleString('en-IN')}
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-16">
                <div className="w-1/2 max-w-[250px]">
                    <div className="flex justify-between py-2 text-sm text-gray-600">
                        <span>Subtotal</span>
                        <span>₹{data.subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm text-gray-600 border-b border-gray-200">
                        <span>GST (12%)</span>
                        <span>₹{data.gstAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between py-3 text-lg font-bold text-gray-900 border-b-2 border-gray-900">
                        <span>Total</span>
                        <span>₹{data.totalAmount.toLocaleString('en-IN')}</span>
                    </div>
                    {data.paymentMethod && (
                        <div className="flex justify-between py-2 text-xs text-gray-500 mt-1">
                            <span>Payment Method</span>
                            <span>{data.paymentMethod}</span>
                        </div>
                    )}
                    {data.paymentStatus && (
                        <div className="flex justify-between py-1 text-xs">
                            <span className="text-gray-500">Status</span>
                            <span className={`font-semibold ${data.paymentStatus === 'Paid' ? 'text-green-700' : 'text-yellow-700'}`}>
                                {data.paymentStatus}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-8 border-t border-gray-200">
                <h4 className="font-serif text-[#0c4a6e] font-bold text-lg mb-1">Thank You For Your Stay!</h4>
                <p className="text-gray-500 text-xs">
                    If you have any questions concerning this invoice, please contact reception.
                </p>
                <p className="text-gray-400 text-xs mt-4">
                    This is a computer-generated invoice and does not require a signature.
                </p>
            </div>
        </div>
    );
});

InvoicePrintTemplate.displayName = 'InvoicePrintTemplate';

export default InvoicePrintTemplate;
