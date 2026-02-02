"use client";

import { RiCalendarEventLine } from "@remixicon/react";
import { addDays, format, isToday } from "date-fns";
import { useMemo } from "react";

import { EventItem } from "./event-item";
import type { CalendarEvent } from "./types";
import { getAgendaEventsForDay } from "./utils";
import { AgendaDaysToShow } from "./constants";

interface AgendaViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventSelect: (event: CalendarEvent) => void;
}

export function AgendaView({
  currentDate,
  events,
  onEventSelect,
}: AgendaViewProps) {
  // Show events for the next days based on constant
  const days = useMemo(() => {
    return Array.from({ length: AgendaDaysToShow }, (_, i) =>
      addDays(new Date(currentDate), i),
    );
  }, [currentDate]);

  // Pre-calculate and memoize events for each day to avoid O(days * events) in render
  const eventsByDay = useMemo(() => {
    return days.map((day) => ({
      day,
      id: day.toString(),
      events: getAgendaEventsForDay(events, day),
    }));
  }, [days, events]);
 
  // Check if there are any days with events
  const hasEvents = useMemo(
    () => eventsByDay.some((d) => d.events.length > 0),
    [eventsByDay],
  );

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    onEventSelect(event);
  };

  return (
    <div className="border-border/70 border-t px-4">
      {!hasEvents ? (
        <div className="flex min-h-[70svh] flex-col items-center justify-center py-16 text-center">
          <RiCalendarEventLine
            className="mb-2 text-muted-foreground/50"
            size={32}
          />
          <h3 className="font-medium text-lg">No events found</h3>
          <p className="text-muted-foreground">
            There are no events scheduled for this time period.
          </p>
        </div>
      ) : (
        eventsByDay.map(({ day, id, events: dayEvents }) => {
          if (dayEvents.length === 0) return null;

          return (
            <div
              className="relative my-12 border-border/70 border-t"
              key={id}
            >
              <span
                className="-top-3 absolute left-0 flex h-6 items-center bg-background pe-4 text-[10px] uppercase data-today:font-medium sm:pe-4 sm:text-xs"
                data-today={isToday(day) || undefined}
              >
                {format(day, "d MMM, EEEE")}
              </span>
              <div className="mt-6 space-y-2">
                {dayEvents.map((event) => (
                  <EventItem
                    event={event}
                    key={event.id}
                    onClick={(e) => handleEventClick(event, e)}
                    view="agenda"
                  />
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
