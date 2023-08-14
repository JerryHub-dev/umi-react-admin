import { ProCard } from '@ant-design/pro-components';
import { formatDate } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid'; // a plugin!
import interactionPlugin from '@fullcalendar/interaction'; // needed for dayClick
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useState } from 'react';
import { INITIAL_EVENTS, createEventId } from './event-utils';

function renderEventContent(eventInfo: any) {
  return (
    <>
      <b>{eventInfo.timeText}</b>
      <i>{eventInfo.event.title}</i>
    </>
  );
}

function renderSidebarEvent(event: any) {
  return (
    <li key={event.id}>
      <b>
        {formatDate(event.start, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })}
      </b>
      <i>{event.title}</i>
    </li>
  );
}
export default () => {
  const [state, setState] = useState({
    weekendsVisible: true,
    currentEvents: [],
  });

  const handleWeekendsToggle = () => {
    setState({
      ...state,
      weekendsVisible: !state.weekendsVisible,
    });
  };

  const renderSidebar = () => {
    return (
      <div className="demo-app-sidebar">
        <div className="demo-app-sidebar-section">
          <h2>Instructions</h2>
          <ul>
            <li>Select dates and you will be prompted to create a new event</li>
            <li>Drag, drop, and resize events</li>
            <li>Click an event to delete it</li>
          </ul>
        </div>
        <div className="demo-app-sidebar-section">
          <label>
            <input
              type="checkbox"
              checked={state.weekendsVisible}
              onChange={handleWeekendsToggle}
            ></input>
            toggle weekends
          </label>
        </div>
        <div className="demo-app-sidebar-section">
          <h2>All Events ({state.currentEvents.length})</h2>
          <ul>{state.currentEvents.map(renderSidebarEvent)}</ul>
        </div>
      </div>
    );
  };

  const handleDateSelect = (selectInfo: any) => {
    let title = prompt('Please enter a new title for your event');
    let calendarApi = selectInfo.view.calendar;

    calendarApi.unselect(); // clear date selection

    if (title) {
      calendarApi.addEvent({
        id: createEventId(),
        title,
        start: selectInfo.startStr,
        end: selectInfo.endStr,
        allDay: selectInfo.allDay,
      });
    }
  };

  const handleEventClick = (clickInfo: any) => {
    if (
      confirm(
        `Are you sure you want to delete the event '${clickInfo.event.title}'`,
      )
    ) {
      clickInfo.event.remove();
    }
  };

  const handleEvents = (events: any) => {
    setState({
      ...state,
      currentEvents: events,
    });
  };

  return (
    <ProCard className="shadow-2xl">
      {renderSidebar()}
      <FullCalendar
        // 插件
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        // 初始视图
        initialView="dayGridMonth"
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        // 日期
        // weekends={false}
        weekends={state.weekendsVisible}
        initialEvents={INITIAL_EVENTS} // 或者，使用' events '设置从提要中获取
        select={handleDateSelect}
        eventContent={renderEventContent} // 自定义渲染功能
        eventClick={handleEventClick}
        eventsSet={handleEvents} // 在事件初始化/添加/更改/删除后调用
        // 事件
        // events={[
        //   { title: 'event 1', date: '2023-08-15' },
        //   { title: 'event 2', date: '2019-04-02' },
        // ]}
        // 点击日期
        dateClick={(arg) => {
          // alert(arg.dateStr)
          console.log(arg.dateStr);
        }}
        /* 你可以在这些触发时更新远程数据库:
          eventAdd={function(){}}
          eventChange={function(){}}
          eventRemove={function(){}}
        */
      />
    </ProCard>
  );
};
