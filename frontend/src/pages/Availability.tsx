import { useMutation, useQuery } from '@apollo/client';
import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  GET_MY_AVAILABILITY,
} from '../graphql/queries';
import {
  ADD_AVAILABILITY_SLOT,
  DELETE_AVAILABILITY_SLOT,
} from '../graphql/mutations';
import styles from '../styles/pages/Availability.module.css';

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ROW_HOURS = Array.from({ length: 16 }, (_, i) => 7 + i);

const slotKey = (day: number, hour: number) => `${day}-${hour}`;
const formatHourLabel = (hour: number) => {
  const period = hour >= 12 ? 'PM' : 'AM';
  const normalized = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalized}:00 ${period}`;
};


export default function Availability() {
  const { user } = useAuth();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const { data, loading, error, refetch } = useQuery(GET_MY_AVAILABILITY, {
    fetchPolicy: 'cache-and-network',
  });

  const [addAvailabilitySlot] = useMutation(ADD_AVAILABILITY_SLOT);
  const [deleteAvailabilitySlot] = useMutation(DELETE_AVAILABILITY_SLOT);

  const slots = data?.getMyAvailability ?? [];

  const slotMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const slot of slots) {
      const startHour = Number(slot.startTime.split(':')[0]);
      map.set(slotKey(slot.dayOfWeek, startHour), slot.id);
    }
    return map;
  }, [slots]);

  const selectedSlotCount = slotMap.size;
  const totalHours = selectedSlotCount;

  const handleToggleSlot = async (day: number, hour: number) => {
    const key = slotKey(day, hour);
    const existingId = slotMap.get(key);

    try {
      if (existingId) {
        await deleteAvailabilitySlot({ variables: { id: existingId } });
        setStatusMessage('Slot removed.');
      } else {
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
    } catch (err) {
      console.error(err);
      setStatusMessage('Unable to update availability right now.');
    }
  };

  const clearAllSlots = async () => {
    if (!slots.length) return;
    try {
      await Promise.all(
        Array.from(slotMap.values()).map((id) =>
          deleteAvailabilitySlot({ variables: { id } })
        )
      );
      setStatusMessage('All availability cleared.');
      await refetch();
    } catch (err) {
      console.error(err);
      setStatusMessage('Unable to clear availability.');
    }
  };

  const saveAvailability = async () => {
    try {
      await refetch();
      setStatusMessage('Availability saved.');
    } catch (err) {
      console.error(err);
      setStatusMessage('Unable to save availability.');
    }
  };

  const applyQuickAction = async (
    dayNumbers: number[],
    startHour: number,
    endHour: number
  ) => {
    try {
      const tasks: Promise<any>[] = [];
      for (const day of dayNumbers) {
        for (let hour = startHour; hour < endHour; hour += 1) {
          const key = slotKey(day, hour);
          if (!slotMap.has(key)) {
            tasks.push(
              addAvailabilitySlot({
                variables: {
                  dayOfWeek: day,
                  startTime: `${String(hour).padStart(2, '0')}:00`,
                  endTime: `${String(hour + 1).padStart(2, '0')}:00`,
                  isRecurring: true,
                },
              })
            );
          }
        }
      }
      await Promise.all(tasks);
      setStatusMessage('Quick availability updated.');
      await refetch();
    } catch (err) {
      console.error(err);
      setStatusMessage('Unable to apply quick action.');
    }
  };

  if (!user) {
    return <div className={styles.loading}>Loading availability…</div>;
  }

  if (loading) {
    return <div className={styles.loading}>Loading availability…</div>;
  }

  if (error) {
    return <div className={styles.error}>Unable to load availability.</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>

          <h1>Manage Availability</h1>
          <p className={styles.pageDescription}>
            Select the time slots when you're available for study sessions.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className="btn-outline" onClick={clearAllSlots}>
            Clear All
          </button>
          <button type="button" className="btn-primary" onClick={saveAvailability}>
            Save Availability
          </button>
        </div>
      </div>

      <div className={styles.topCards}>
        <div className={styles.cardBlue}>
          <p className={styles.cardLabel}>Available Time Slots</p>
          <strong>{selectedSlotCount}</strong>
        </div>
        <div className={styles.cardPink}>
          <p className={styles.cardLabel}>Total Hours Available</p>
          <strong>{totalHours} hrs</strong>
        </div>
      </div>

      <div className={styles.helpPanel}>
        <div className={styles.helpIcon}>i</div>
        <div>
          <p className={styles.helpTitle}>How to set your availability</p>
          <p className={styles.helpText}>
            Click on time slots to toggle your availability. Selected slots will be highlighted
            in indigo. Your study buddies can only book sessions during your available times.
          </p>
        </div>
      </div>

      <div className={styles.availabilityBoard}>
        <div className={styles.boardHeader}>
          <h2>Weekly Availability</h2>
        </div>

        <div className={styles.gridContainer}>
          <div className={styles.gridRow}>
            <div className={styles.gridLabel} />
            {DAY_LABELS.map((day) => (
              <div key={day} className={styles.gridDayHeader}>
                {day}
              </div>
            ))}
          </div>

          {ROW_HOURS.map((hour) => (
            <div key={hour} className={styles.gridRow}>
              <div className={styles.gridTimeLabel}>{formatHourLabel(hour)}</div>
              {DAY_ORDER.map((day) => {
                const key = slotKey(day, hour);
                const isActive = slotMap.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.gridCell} ${isActive ? styles.gridCellActive : ''}`}
                    onClick={() => handleToggleSlot(day, hour)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.quickActions}>
        <p className={styles.quickTitle}>Quick Actions</p>
        <div className={styles.quickButtonRow}>
          <button
            type="button"
            className={`btn-outline ${styles.quickButton}`}
            onClick={() => applyQuickAction([1, 2, 3, 4, 5], 9, 12)}
          >
            Set Weekday Mornings
          </button>
          <button
            type="button"
            className={`btn-outline ${styles.quickButton}`}
            onClick={() => applyQuickAction([1, 2, 3, 4, 5], 14, 18)}
          >
            Set Weekday Afternoons
          </button>
          <button
            type="button"
            className={`btn-outline ${styles.quickButton}`}
            onClick={() => applyQuickAction([6, 0], 10, 16)}
          >
            Set Weekend Days
          </button>
        </div>
      </div>

      {statusMessage && <div className={styles.statusMessage}>{statusMessage}</div>}
    </div>
  );
}
