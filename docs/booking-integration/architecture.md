# Jurnii Booking Integration Architecture

This document describes the design, API contracts, and sync logic for the Jurnii Website Booking Form Integration with Zoho CRM and Google Calendar.

## High-Level Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Visitor
    participant Frontend as Website (booking-form.js)
    participant API as Vercel Serverless (api/v1)
    participant Zoho as Zoho CRM EU
    participant Google as Google Calendar API

    %% Step 1: Initialize
    Visitor->>Frontend: Enter Name & Email (Step 1)
    Frontend->>API: POST /api/v1/submissions/start
    Note over API: Search duplicates (Lead/Contact)<br/>Create Lead if new
    API->>Zoho: Search & Insert Lead
    Zoho-->>API: Lead Record Created
    Note over API: Generate jwt token with Lead ID
    API-->>Frontend: Returns Token & Submission ID
    Frontend-->>Visitor: Renders Company Details (Step 2)

    %% Step 2: Enrich
    Visitor->>Frontend: Enter Company & Phone (Step 2)
    Frontend->>API: PATCH /api/v1/submissions/{id} (Auth: Bearer Token)
    API->>Zoho: Update Lead Details
    Note over API: Poll Lead record 5 times (1s interval)<br/>to check if auto-converted
    API-->>Frontend: Returns updated Token (with Contact/Deal IDs if converted)
    Frontend-->>Visitor: Renders Scheduler Calendar (Step 3)

    %% Step 3: Calendar & Finalize
    Frontend->>API: GET /api/v1/availability
    API->>Google: checkFreeBusy (Host Calendar)
    Google-->>API: FreeBusy Busy Slots
    Note over API: Filter weekday working hours (09:00 - 18:00)<br/>Buffer 15m pre/post slot, 24h notice, 60d horizon
    API-->>Frontend: Available Localized Slots
    Visitor->>Frontend: Select Slot & Confirm Booking
    Frontend->>API: POST /api/v1/bookings (Auth: Bearer Token)
    Note over API: Re-verify slot availability<br/>Ensure Idempotency: scan Google Extended Props
    API->>Google: Insert Event (with Google Meet)
    Google-->>API: Event Created with Meet Link
    Note over API: Check Zoho Event Idempotency
    API->>Zoho: Create Events Record (What_Id=Deal or Contact)
    Zoho-->>API: Event Record Stamped
    API-->>Frontend: Confirm Booking & Return Meet Link
    Frontend-->>Visitor: Render Step 4 Confirmation Card (with Meet Link)
```

## Progressive State Management

Because Jurnii does not use a persistent database for front-end sessions, all step continuity is cryptographically secured using JWT tokens issued by the serverless backend.

1. **Step 1 (`/api/v1/submissions/start`)**:
   - Generates a Lead record in Zoho CRM if the email is not already associated with a Lead or Contact.
   - Signs and returns a JWT token containing:
     - `leadId`
     - `contactId` (null)
     - `step`: 1
     - `email`
     - `submissionId` (either custom module ID or fallback `MOCK_SUBMISSION_ID`)

2. **Step 2 (`/api/v1/submissions/{id}`)**:
   - Accepts the JWT token in the `Authorization: Bearer <token>` header.
   - Updates the Lead or Contact details in Zoho CRM.
   - If a Lead was updated, the endpoint polls the Lead record up to 5 times (with 1-second intervals) checking for the `Is_Converted` flag. This allows it to automatically resolve and capture any `Converted_Contact` or `Converted_Deal` lookup IDs that were generated asynchronously by Zoho workflows.
   - Signs and returns an updated JWT token containing resolved IDs.

3. **Step 3 (`/api/v1/bookings`)**:
   - Accepts the JWT token in the `Authorization: Bearer <token>` header.
   - Inserts the event on Google Calendar, requesting a Google Meet link.
   - Maps the event to Zoho CRM under the corresponding Deal (`What_Id`) or Contact (`Who_Id`).

## Idempotency Rules

To prevent duplicate calendar invitations and Zoho Event records in case of network retries or page refreshes:

- **Google Calendar**: The Google Calendar event stores the `submissionId` inside private extended properties (`privateExtendedProperty: 'submissionId=SUB_...'`). Before inserting any event, the API performs a list query filtering on this property.
- **Zoho CRM**: The Zoho Event record stores the `submissionId` in the custom field `Ext_Calendar_Booking_ID`. The API searches for an existing Event with this ID before calling the insert API.

## Local Timezone Handling

- Host working hours are evaluated in the host's target timezone (09:00 - 18:00, Monday to Friday).
- Dynamic slots returned by `/api/v1/availability` are ISO string timestamps.
- The frontend `booking-form.js` converts the ISO timestamps into the visitor's local timezone (e.g., GMT/CET/EST) using `date.toLocaleTimeString()` and `date.toLocaleDateString()` for a personalized client experience.
