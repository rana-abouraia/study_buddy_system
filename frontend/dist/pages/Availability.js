import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMutation, useQuery } from '@apollo/client';
import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GET_MY_AVAILABILITY, } from '../graphql/queries';
import { ADD_AVAILABILITY_SLOT, DELETE_AVAILABILITY_SLOT, } from '../graphql/mutations';
import styles from '../styles/pages/Availability.module.css';
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ROW_HOURS = Array.from({ length: 16 }, (_, i) => 7 + i);
const slotKey = (day, hour) => `${day}-${hour}`;
const formatHourLabel = (hour) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const normalized = hour % 12 === 0 ? 12 : hour % 12;
    return `${normalized}:00 ${period}`;
};
export default function Availability() {
    const { user } = useAuth();
    const [statusMessage, setStatusMessage] = useState(null);
    const { data, loading, error, refetch } = useQuery(GET_MY_AVAILABILITY, {
        fetchPolicy: 'cache-and-network',
    });
    const [addAvailabilitySlot] = useMutation(ADD_AVAILABILITY_SLOT);
    const [deleteAvailabilitySlot] = useMutation(DELETE_AVAILABILITY_SLOT);
    const slots = data?.getMyAvailability ?? [];
    const slotMap = useMemo(() => {
        const map = new Map();
        for (const slot of slots) {
            const startHour = Number(slot.startTime.split(':')[0]);
            map.set(slotKey(slot.dayOfWeek, startHour), slot.id);
        }
        return map;
    }, [slots]);
    const selectedSlotCount = slotMap.size;
    const totalHours = selectedSlotCount;
    const handleToggleSlot = async (day, hour) => {
        const key = slotKey(day, hour);
        const existingId = slotMap.get(key);
        try {
            if (existingId) {
                await deleteAvailabilitySlot({ variables: { id: existingId } });
                setStatusMessage('Slot removed.');
            }
            else {
                await addAvailabilitySlot({
                    variables: {
                        dayOfWeek: day,
                        startTime: `${String(hour).padStart(2, '0')}:00`,
                        endTime: `${String(hour + 1).padStart(2, '0')}:00`,
                        isRecurring: true,
                    },
                });
                setStatusMessage('Slot added.');
            }
            await refetch();
        }
        catch (err) {
            console.error(err);
            setStatusMessage('Unable to update availability right now.');
        }
    };
    const clearAllSlots = async () => {
        if (!slots.length)
            return;
        try {
            await Promise.all(Array.from(slotMap.values()).map((id) => deleteAvailabilitySlot({ variables: { id } })));
            setStatusMessage('All availability cleared.');
            await refetch();
        }
        catch (err) {
            console.error(err);
            setStatusMessage('Unable to clear availability.');
        }
    };
    const saveAvailability = async () => {
        try {
            await refetch();
            setStatusMessage('Availability saved.');
        }
        catch (err) {
            console.error(err);
            setStatusMessage('Unable to save availability.');
        }
    };
    const applyQuickAction = async (dayNumbers, startHour, endHour) => {
        try {
            const tasks = [];
            for (const day of dayNumbers) {
                for (let hour = startHour; hour < endHour; hour += 1) {
                    const key = slotKey(day, hour);
                    if (!slotMap.has(key)) {
                        tasks.push(addAvailabilitySlot({
                            variables: {
                                dayOfWeek: day,
                                startTime: `${String(hour).padStart(2, '0')}:00`,
                                endTime: `${String(hour + 1).padStart(2, '0')}:00`,
                                isRecurring: true,
                            },
                        }));
                    }
                }
            }
            await Promise.all(tasks);
            setStatusMessage('Quick availability updated.');
            await refetch();
        }
        catch (err) {
            console.error(err);
            setStatusMessage('Unable to apply quick action.');
        }
    };
    if (!user) {
        return _jsx("div", { className: styles.loading, children: "Loading availability\u2026" });
    }
    if (loading) {
        return _jsx("div", { className: styles.loading, children: "Loading availability\u2026" });
    }
    if (error) {
        return _jsx("div", { className: styles.error, children: "Unable to load availability." });
    }
    return (_jsxs("div", { className: styles.page, children: [_jsxs("div", { className: styles.pageHeader, children: [_jsxs("div", { children: [_jsx("h1", { children: "Manage Availability" }), _jsx("p", { className: styles.pageDescription, children: "Select the time slots when you're available for study sessions." })] }), _jsxs("div", { className: styles.headerActions, children: [_jsx("button", { type: "button", className: "btn-outline", onClick: clearAllSlots, children: "Clear All" }), _jsx("button", { type: "button", className: "btn-primary", onClick: saveAvailability, children: "Save Availability" })] })] }), _jsxs("div", { className: styles.topCards, children: [_jsxs("div", { className: styles.cardBlue, children: [_jsx("p", { className: styles.cardLabel, children: "Available Time Slots" }), _jsx("strong", { children: selectedSlotCount })] }), _jsxs("div", { className: styles.cardPink, children: [_jsx("p", { className: styles.cardLabel, children: "Total Hours Available" }), _jsxs("strong", { children: [totalHours, " hrs"] })] })] }), _jsxs("div", { className: styles.helpPanel, children: [_jsx("div", { className: styles.helpIcon, children: "i" }), _jsxs("div", { children: [_jsx("p", { className: styles.helpTitle, children: "How to set your availability" }), _jsx("p", { className: styles.helpText, children: "Click on time slots to toggle your availability. Selected slots will be highlighted in indigo. Your study buddies can only book sessions during your available times." })] })] }), _jsxs("div", { className: styles.availabilityBoard, children: [_jsx("div", { className: styles.boardHeader, children: _jsx("h2", { children: "Weekly Availability" }) }), _jsxs("div", { className: styles.gridContainer, children: [_jsxs("div", { className: styles.gridRow, children: [_jsx("div", { className: styles.gridLabel }), DAY_LABELS.map((day) => (_jsx("div", { className: styles.gridDayHeader, children: day }, day)))] }), ROW_HOURS.map((hour) => (_jsxs("div", { className: styles.gridRow, children: [_jsx("div", { className: styles.gridTimeLabel, children: formatHourLabel(hour) }), DAY_ORDER.map((day) => {
                                        const key = slotKey(day, hour);
                                        const isActive = slotMap.has(key);
                                        return (_jsx("button", { type: "button", className: `${styles.gridCell} ${isActive ? styles.gridCellActive : ''}`, onClick: () => handleToggleSlot(day, hour) }, key));
                                    })] }, hour)))] })] }), _jsxs("div", { className: styles.quickActions, children: [_jsx("p", { className: styles.quickTitle, children: "Quick Actions" }), _jsxs("div", { className: styles.quickButtonRow, children: [_jsx("button", { type: "button", className: `btn-outline ${styles.quickButton}`, onClick: () => applyQuickAction([1, 2, 3, 4, 5], 9, 12), children: "Set Weekday Mornings" }), _jsx("button", { type: "button", className: `btn-outline ${styles.quickButton}`, onClick: () => applyQuickAction([1, 2, 3, 4, 5], 14, 18), children: "Set Weekday Afternoons" }), _jsx("button", { type: "button", className: `btn-outline ${styles.quickButton}`, onClick: () => applyQuickAction([6, 0], 10, 16), children: "Set Weekend Days" })] })] }), statusMessage && _jsx("div", { className: styles.statusMessage, children: statusMessage })] }));
}
