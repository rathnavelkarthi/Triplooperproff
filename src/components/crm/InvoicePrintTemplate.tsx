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
    roomPrice?: number;
    discount?: number;
    taxableValue?: number;
    gstAmount: number;
    totalAmount: number;
    commissionAmount?: number;
    amountPayableToProperty?: number;
    paymentMethod?: string;
    paymentStatus?: string;
    hotelName?: string;
    hotelAddress?: string;
    hotelEmail?: string;
    hotelPhone?: string;
}

interface Props {
    data: InvoiceData;
    mode?: 'all' | 'customer' | 'settlement';
}

const InvoicePrintTemplate = forwardRef<HTMLDivElement, Props>(({ data, mode = 'all' }, ref) => {
    const roomPrice = data.roomPrice ?? data.subtotal;
    const discount = data.discount ?? 0;
    const taxableValue = data.taxableValue ?? Math.max(0, roomPrice - discount);
    const gstAmount = data.gstAmount;
    const totalBookingAmount = data.totalAmount ?? (taxableValue + gstAmount);
    const commissionAmount = data.commissionAmount ?? Math.round(taxableValue * 0.12);
    const amountPayableToProperty = data.amountPayableToProperty ?? (totalBookingAmount - commissionAmount);

    const showCustomerBill = mode === 'all' || mode === 'customer';
    const showSettlementBill = mode === 'all' || mode === 'settlement';

    return (
        <div
            ref={ref}
            className="invoice-print-area bg-white p-8 sm:p-12 w-full max-w-2xl text-gray-900 font-sans"
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
            <div className="mb-8">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Bill To</p>
                <h3 className="text-lg font-bold text-gray-900">{data.guestName}</h3>
                {data.guestLocation && <p className="text-gray-600 text-sm mt-1">{data.guestLocation}</p>}
                {data.guestPhone && <p className="text-gray-600 text-sm">{data.guestPhone}</p>}
                {data.guestEmail && <p className="text-gray-600 text-sm">{data.guestEmail}</p>}
            </div>

            {/* 1. Customer Tax Bill */}
            {showCustomerBill && (
                <div className="mb-10 border border-gray-200 rounded-2xl p-6 bg-gray-50/50">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
                        <h3 className="text-base font-bold text-gray-900">1. Customer Tax Bill</h3>
                        <span className="text-xs text-gray-500 font-mono">Customer Copy</span>
                    </div>
                    
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-gray-300 text-gray-600 font-semibold">
                                <th className="py-2 text-left">Particulars</th>
                                <th className="py-2 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            <tr>
                                <td className="py-2.5 text-gray-700">Room Charges</td>
                                <td className="py-2.5 text-right font-medium">₹{roomPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                            {discount > 0 && (
                                <tr>
                                    <td className="py-2.5 text-gray-700">Discount</td>
                                    <td className="py-2.5 text-right font-medium text-red-600">-₹{discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            )}
                            <tr>
                                <td className="py-2.5 font-semibold text-gray-900">Taxable Value</td>
                                <td className="py-2.5 text-right font-bold text-gray-900">₹{taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr>
                                <td className="py-2.5 text-gray-700">GST @12%</td>
                                <td className="py-2.5 text-right font-medium">₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr className="bg-gray-100/80 font-bold text-gray-900">
                                <td className="py-3 px-2 text-gray-900 text-base">Grand Total</td>
                                <td className="py-3 px-2 text-right text-base text-[#0c4a6e]">₹{totalBookingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* 2. Property Settlement Bill */}
            {showSettlementBill && (
                <div className="mb-10 border border-gray-200 rounded-2xl p-6 bg-gray-50/50">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
                        <h3 className="text-base font-bold text-gray-900">Property Settlement Bill</h3>
                        <span className="text-xs text-gray-500 font-mono">To Property</span>
                    </div>

                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr className="border-b border-gray-300 text-gray-600 font-semibold">
                                <th className="py-2 text-left">Particulars</th>
                                <th className="py-2 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            <tr>
                                <td className="py-2.5 text-gray-700">Room Price</td>
                                <td className="py-2.5 text-right font-medium">₹{roomPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                            {discount > 0 && (
                                <tr>
                                    <td className="py-2.5 text-gray-700">Discount</td>
                                    <td className="py-2.5 text-right font-medium text-red-600">-₹{discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            )}
                            <tr>
                                <td className="py-2.5 font-bold text-gray-900">Commissionable Amount</td>
                                <td className="py-2.5 text-right font-bold text-gray-900">₹{taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr>
                                <td className="py-2.5 text-gray-700">GST @12%</td>
                                <td className="py-2.5 text-right font-medium">₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr className="font-bold">
                                <td className="py-2.5 text-gray-900">Total Booking Amount</td>
                                <td className="py-2.5 text-right text-gray-900">₹{totalBookingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                            <tr>
                                <td className="py-2.5 text-gray-700">
                                    Less: Triplooper Commission (12% of ₹{taxableValue.toLocaleString('en-IN')})
                                </td>
                                <td className="py-2.5 text-right font-medium text-amber-700">
                                    -₹{commissionAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                            <tr className="bg-emerald-50/80 font-extrabold text-gray-900">
                                <td className="py-3 px-2 text-emerald-900 text-base">Amount Payable to Property</td>
                                <td className="py-3 px-2 text-right text-base text-emerald-800">
                                    ₹{amountPayableToProperty.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            {/* Footer */}
            <div className="text-center pt-8 border-t border-gray-200">
                <h4 className="font-serif text-[#0c4a6e] font-bold text-lg mb-1">Thank You For Your Business!</h4>
                <p className="text-gray-500 text-xs">
                    If you have any questions concerning this invoice statement, please contact Triplooper Support.
                </p>
                <p className="text-gray-400 text-xs mt-4">
                    This is a computer-generated statement and does not require a physical signature.
                </p>
            </div>
        </div>
    );
});

InvoicePrintTemplate.displayName = 'InvoicePrintTemplate';

export default InvoicePrintTemplate;
