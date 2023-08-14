/**
 * FullCalendar 日历 官网: https://fullcalendar.io/
 * dayGridPlugin 月视图
 * timeGridPlugin 周视图
 * interactionPlugin 交互
 * multiMonthPlugin 多月视图
 * zhLocale 语言
 */
import { ProCard } from '@ant-design/pro-components';
import {
  DateSelectArg,
  EventApi,
  EventClickArg,
  EventContentArg,
  formatDate,
} from '@fullcalendar/core';
import zhLocale from '@fullcalendar/core/locales/zh-cn';
import dayGridPlugin from '@fullcalendar/daygrid'; // a plugin!
import interactionPlugin from '@fullcalendar/interaction'; // needed for dayClick
import multiMonthPlugin from '@fullcalendar/multimonth';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useState } from 'react';

import { INITIAL_EVENTS, createEventId } from './event-utils';

function renderEventContent(eventContent: EventContentArg) {
  return (
    <>
      <b>{eventContent.timeText}</b>
      <i>{eventContent.event.title}</i>
    </>
  );
}

function renderSidebarEvent(event: EventApi) {
  return (
    <li key={event.id}>
      <b>
        {formatDate(event.start!, {
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
          {/* <h2>Instructions</h2> */}
          <h2>说明: </h2>
          <ul>
            {/* <li>Select dates and you will be prompted to create a new event</li> */}
            <li>选择日期，系统将提示您创建一个新事件</li>
            {/* <li>Drag, drop, and resize events</li> */}
            <li>拖放和调整事件大小</li>
            {/* <li>Click an event to delete it</li> */}
            <li>单击需要删除的事件</li>
          </ul>
        </div>
        <div className="demo-app-sidebar-section">
          <label>
            <input
              type="checkbox"
              checked={state.weekendsVisible}
              onChange={handleWeekendsToggle}
            ></input>
            切换周末
          </label>
        </div>
        <div className="demo-app-sidebar-section">
          <h2>所有事件 ({state.currentEvents.length})</h2>
          <ul>{state.currentEvents.map(renderSidebarEvent)}</ul>
        </div>
      </div>
    );
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    // let title = prompt('Please enter a new title for your event');
    let title = prompt('请为您的活动输入一个新标题');
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

  const handleEventClick = (clickInfo: EventClickArg) => {
    if (
      confirm(
        // `Are you sure you want to delete the event '${clickInfo.event.title}'`,
        `您确定要删除事件吗 '${clickInfo.event.title}'`,
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
      <div className="demo-app">
        <FullCalendar
          // 语言
          locale={zhLocale}
          // 插件
          plugins={[
            dayGridPlugin,
            timeGridPlugin,
            interactionPlugin,
            multiMonthPlugin,
          ]}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'multiMonthYear,dayGridMonth,timeGridWeek,timeGridDay',
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
        <div className="shadow-2xl p-8 m-8">{renderSidebar()}</div>
      </div>
    </ProCard>
  );
};
