# Database Schema Architecture

## 개요

이 문서는 AI Planner 애플리케이션의 PostgreSQL 데이터베이스 스키마 아키텍처를 설명합니다.

**데이터베이스 엔진**: PostgreSQL 15  
**마이그레이션 시스템**: SQL 파일 기반  
**UUID 생성**: `gen_random_uuid()` 사용

---

## 테이블 목록

### Core Tables (001_create_tables.sql)
- `users` - 사용자 계정 정보
- `calendars` - 캘린더 정보
- `events` - 이벤트/일정 정보
- `calendar_permissions` - 캘린더 공유 권한

### User Management (002_add_role_to_users.sql)
- `users.role` 컬럼 추가

### Organization & Team Management (004_create_organizations.sql)
- `organizations` - 조직 정보
- `organization_users` - 조직 멤버십
- `teams` - 팀 정보
- `team_users` - 팀 멤버십
- `organization_invitations` - 조직 초대

### Task Management (005_create_tasks.sql)
- `tasks` - 작업/태스크 정보

### AI Assistant (006_create_ai_conversations.sql)
- `ai_conversations` - AI 대화 컨텍스트
- `ai_messages` - AI 대화 메시지
- `ai_interaction_logs` - AI 상호작용 로그
- `ai_user_preferences` - AI 사용자 설정

---

## 테이블 상세 설명

### 1. users

사용자 계정 정보를 저장하는 핵심 테이블입니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 사용자 고유 ID |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | 이메일 주소 |
| `name` | VARCHAR(255) | NOT NULL | 사용자 이름 |
| `password_hash` | VARCHAR(255) | NOT NULL | 비밀번호 해시 (bcrypt) |
| `avatar_url` | TEXT | NULL | 아바타 이미지 URL |
| `role` | VARCHAR(20) | DEFAULT 'user', CHECK | 사용자 역할 ('user', 'admin') |
| `created_at` | TIMESTAMP | DEFAULT NOW() | 생성 일시 |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | 수정 일시 |

**관계**:
- 한 사용자는 여러 캘린더를 가질 수 있음 (`calendars.user_id`)
- 한 사용자는 여러 이벤트를 가질 수 있음 (캘린더를 통해)
- 한 사용자는 여러 태스크를 가질 수 있음 (`tasks.user_id`)
- 한 사용자는 여러 조직에 소속될 수 있음 (`organization_users.user_id`)

---

### 2. calendars

사용자의 캘린더 정보를 저장합니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 캘린더 고유 ID |
| `user_id` | UUID | NOT NULL, FK → users(id) ON DELETE CASCADE | 소유자 사용자 ID |
| `name` | VARCHAR(255) | NOT NULL | 캘린더 이름 |
| `color` | VARCHAR(7) | NOT NULL, DEFAULT '#3B82F6' | 캘린더 색상 (HEX) |
| `is_primary` | BOOLEAN | DEFAULT FALSE | 기본 캘린더 여부 |
| `created_at` | TIMESTAMP | DEFAULT NOW() | 생성 일시 |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | 수정 일시 |

**관계**:
- 한 캘린더는 여러 이벤트를 가질 수 있음 (`events.calendar_id`)
- 한 사용자는 여러 캘린더를 가질 수 있음
- 한 캘린더는 여러 권한을 가질 수 있음 (`calendar_permissions.calendar_id`)

**인덱스**:
- `idx_calendars_user_id` ON `calendars(user_id)`

---

### 3. events

일정/이벤트 정보를 저장합니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 이벤트 고유 ID |
| `calendar_id` | UUID | NOT NULL, FK → calendars(id) ON DELETE CASCADE | 소속 캘린더 ID |
| `title` | VARCHAR(255) | NOT NULL | 이벤트 제목 |
| `description` | TEXT | NULL | 이벤트 설명 |
| `start_time` | TIMESTAMP | NOT NULL | 시작 시간 |
| `end_time` | TIMESTAMP | NOT NULL | 종료 시간 |
| `is_all_day` | BOOLEAN | DEFAULT FALSE | 종일 이벤트 여부 |
| `location` | TEXT | NULL | 장소 |
| `color` | VARCHAR(7) | DEFAULT '#3B82F6' | 이벤트 색상 |
| `attendees` | JSONB | NULL | 참석자 목록 (JSON 배열) |
| `recurrence_rule` | JSONB | NULL | 반복 규칙 (JSON 객체) |
| `created_at` | TIMESTAMP | DEFAULT NOW() | 생성 일시 |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | 수정 일시 |

**관계**:
- 한 이벤트는 하나의 캘린더에만 속함

**인덱스**:
- `idx_events_calendar_id` ON `events(calendar_id)`
- `idx_events_start_time` ON `events(start_time)`
- `idx_events_end_time` ON `events(end_time)`

---

### 4. calendar_permissions

캘린더 공유 권한을 관리합니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 권한 고유 ID |
| `calendar_id` | UUID | NOT NULL, FK → calendars(id) ON DELETE CASCADE | 캘린더 ID |
| `user_id` | UUID | NOT NULL, FK → users(id) ON DELETE CASCADE | 사용자 ID |
| `permission_type` | VARCHAR(20) | NOT NULL, CHECK | 권한 타입 ('read', 'write', 'admin') |
| `created_at` | TIMESTAMP | DEFAULT NOW() | 생성 일시 |

**제약조건**:
- `UNIQUE(calendar_id, user_id)` - 한 캘린더에 대한 사용자당 하나의 권한만 허용

**인덱스**:
- `idx_calendar_permissions_user_id` ON `calendar_permissions(user_id)`
- `idx_calendar_permissions_calendar_id` ON `calendar_permissions(calendar_id)`

---

### 5. organizations

조직 정보를 저장합니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 조직 고유 ID |
| `name` | VARCHAR(255) | NOT NULL | 조직 이름 |
| `description` | TEXT | NULL | 조직 설명 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성 일시 |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 수정 일시 |

**관계**:
- 한 조직은 여러 멤버를 가질 수 있음 (`organization_users.organization_id`)
- 한 조직은 여러 팀을 가질 수 있음 (`teams.organization_id`)
- 한 조직은 여러 초대를 가질 수 있음 (`organization_invitations.organization_id`)

---

### 6. organization_users

조직 멤버십을 관리합니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `organization_id` | UUID | NOT NULL, FK → organizations(id) ON DELETE CASCADE | 조직 ID |
| `user_id` | UUID | NOT NULL, FK → users(id) ON DELETE CASCADE | 사용자 ID |
| `role` | org_role | NOT NULL, DEFAULT 'member' | 조직 내 역할 (ENUM) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성 일시 |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 수정 일시 |

**제약조건**:
- `PRIMARY KEY(organization_id, user_id)` - 복합 기본 키

**ENUM 타입**: `org_role` ('admin', 'member')

**인덱스**:
- `idx_org_users_user` ON `organization_users(user_id)`

---

### 7. teams

조직 내 팀 정보를 저장합니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 팀 고유 ID |
| `organization_id` | UUID | NOT NULL, FK → organizations(id) ON DELETE CASCADE | 소속 조직 ID |
| `name` | VARCHAR(255) | NOT NULL | 팀 이름 |
| `description` | TEXT | NULL | 팀 설명 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성 일시 |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 수정 일시 |

**관계**:
- 한 팀은 여러 멤버를 가질 수 있음 (`team_users.team_id`)
- 한 팀은 여러 태스크를 가질 수 있음 (`tasks.team_id`)

---

### 8. team_users

팀 멤버십을 관리합니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `team_id` | UUID | NOT NULL, FK → teams(id) ON DELETE CASCADE | 팀 ID |
| `user_id` | UUID | NOT NULL, FK → users(id) ON DELETE CASCADE | 사용자 ID |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성 일시 |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 수정 일시 |

**제약조건**:
- `PRIMARY KEY(team_id, user_id)` - 복합 기본 키

**인덱스**:
- `idx_team_users_user` ON `team_users(user_id)`

---

### 9. organization_invitations

조직 초대 정보를 저장합니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 초대 고유 ID |
| `organization_id` | UUID | NOT NULL, FK → organizations(id) ON DELETE CASCADE | 조직 ID |
| `email` | VARCHAR(255) | NOT NULL | 초대받은 이메일 |
| `token` | VARCHAR(255) | NOT NULL, UNIQUE | 초대 토큰 |
| `status` | invitation_status | NOT NULL, DEFAULT 'pending' | 초대 상태 (ENUM) |
| `invited_by` | UUID | NOT NULL, FK → users(id) ON DELETE SET NULL | 초대한 사용자 ID |
| `expires_at` | TIMESTAMPTZ | NOT NULL | 만료 일시 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성 일시 |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 수정 일시 |

**ENUM 타입**: `invitation_status` ('pending', 'accepted', 'expired', 'revoked')

**인덱스**:
- `idx_org_inv_email` ON `organization_invitations(email)`

---

### 10. tasks

작업/태스크 정보를 저장합니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 태스크 고유 ID |
| `user_id` | UUID | NOT NULL, FK → users(id) ON DELETE CASCADE | 소유자 사용자 ID |
| `title` | VARCHAR(255) | NOT NULL | 태스크 제목 |
| `description` | TEXT | NULL | 태스크 설명 |
| `status` | task_status | NOT NULL, DEFAULT 'todo' | 태스크 상태 (ENUM) |
| `priority` | task_priority | NOT NULL, DEFAULT 'medium' | 우선순위 (ENUM) |
| `due_date` | TIMESTAMPTZ | NULL | 마감일 |
| `completed_at` | TIMESTAMPTZ | NULL | 완료 일시 |
| `calendar_id` | UUID | NULL, FK → calendars(id) ON DELETE SET NULL | 연결된 캘린더 ID |
| `organization_id` | UUID | NULL, FK → organizations(id) ON DELETE CASCADE | 소속 조직 ID |
| `team_id` | UUID | NULL, FK → teams(id) ON DELETE CASCADE | 소속 팀 ID |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성 일시 |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 수정 일시 |

**ENUM 타입**:
- `task_status`: 'todo', 'in_progress', 'done', 'cancelled'
- `task_priority`: 'low', 'medium', 'high', 'urgent'

**인덱스**:
- `idx_tasks_user_id` ON `tasks(user_id)`
- `idx_tasks_status` ON `tasks(status)`
- `idx_tasks_due_date` ON `tasks(due_date)`
- `idx_tasks_calendar_id` ON `tasks(calendar_id)`
- `idx_tasks_organization_id` ON `tasks(organization_id)`

---

### 11. ai_conversations

AI 어시스턴트 대화 컨텍스트를 저장합니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 대화 고유 ID |
| `user_id` | UUID | NOT NULL, FK → users(id) ON DELETE CASCADE | 사용자 ID |
| `title` | VARCHAR(255) | NULL | 대화 제목 |
| `context` | JSONB | DEFAULT '{}'::jsonb | 대화 컨텍스트 (JSON) |
| `message_count` | INTEGER | DEFAULT 0 | 메시지 개수 |
| `last_message_at` | TIMESTAMPTZ | NULL | 마지막 메시지 일시 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성 일시 |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 수정 일시 |

**관계**:
- 한 대화는 여러 메시지를 가질 수 있음 (`ai_messages.conversation_id`)

**인덱스**:
- `idx_ai_conversations_user_id` ON `ai_conversations(user_id)`
- `idx_ai_conversations_last_message` ON `ai_conversations(last_message_at)`

---

### 12. ai_messages

AI 대화의 개별 메시지를 저장합니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 메시지 고유 ID |
| `conversation_id` | UUID | NOT NULL, FK → ai_conversations(id) ON DELETE CASCADE | 대화 ID |
| `role` | VARCHAR(20) | NOT NULL, CHECK | 역할 ('system', 'user', 'assistant') |
| `content` | TEXT | NOT NULL | 메시지 내용 |
| `metadata` | JSONB | DEFAULT '{}'::jsonb | 메타데이터 (JSON) |
| `token_count` | INTEGER | NULL | 토큰 개수 |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성 일시 |

**인덱스**:
- `idx_ai_messages_conversation_id` ON `ai_messages(conversation_id)`
- `idx_ai_messages_created_at` ON `ai_messages(created_at)`

---

### 13. ai_interaction_logs

AI 상호작용 로그를 저장합니다 (분석 및 디버깅용).

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 로그 고유 ID |
| `user_id` | UUID | NOT NULL, FK → users(id) ON DELETE CASCADE | 사용자 ID |
| `conversation_id` | UUID | NULL, FK → ai_conversations(id) ON DELETE SET NULL | 대화 ID |
| `intent` | VARCHAR(100) | NULL | 사용자 의도 |
| `action_type` | VARCHAR(100) | NULL | 수행된 액션 타입 |
| `input_text` | TEXT | NULL | 입력 텍스트 |
| `output_text` | TEXT | NULL | 출력 텍스트 |
| `tokens_used` | INTEGER | NULL | 사용된 토큰 수 |
| `model_used` | VARCHAR(50) | NULL | 사용된 모델 |
| `success` | BOOLEAN | DEFAULT true | 성공 여부 |
| `error_message` | TEXT | NULL | 에러 메시지 |
| `execution_time_ms` | INTEGER | NULL | 실행 시간 (밀리초) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성 일시 |

**인덱스**:
- `idx_ai_logs_user_id` ON `ai_interaction_logs(user_id)`
- `idx_ai_logs_created_at` ON `ai_interaction_logs(created_at)`
- `idx_ai_logs_intent` ON `ai_interaction_logs(intent)`

---

### 14. ai_user_preferences

AI 어시스턴트 사용자 설정을 저장합니다.

| 컬럼명 | 타입 | 제약조건 | 설명 |
|--------|------|----------|------|
| `user_id` | UUID | PRIMARY KEY, FK → users(id) ON DELETE CASCADE | 사용자 ID |
| `preferred_model` | VARCHAR(50) | DEFAULT 'gpt-3.5-turbo' | 선호 모델 |
| `max_tokens_per_request` | INTEGER | DEFAULT 1000 | 요청당 최대 토큰 수 |
| `enable_streaming` | BOOLEAN | DEFAULT true | 스트리밍 사용 여부 |
| `conversation_history_days` | INTEGER | DEFAULT 30 | 대화 기록 보관 기간 (일) |
| `auto_summarize_conversations` | BOOLEAN | DEFAULT false | 대화 자동 요약 여부 |
| `preferences` | JSONB | DEFAULT '{}'::jsonb | 추가 설정 (JSON) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 생성 일시 |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | 수정 일시 |

---

## ENUM 타입

### org_role
조직 내 사용자 역할
- `admin`: 관리자
- `member`: 일반 멤버

### invitation_status
조직 초대 상태
- `pending`: 대기 중
- `accepted`: 수락됨
- `expired`: 만료됨
- `revoked`: 취소됨

### task_status
태스크 상태
- `todo`: 할 일
- `in_progress`: 진행 중
- `done`: 완료
- `cancelled`: 취소됨

### task_priority
태스크 우선순위
- `low`: 낮음
- `medium`: 보통
- `high`: 높음
- `urgent`: 긴급

---

## 데이터 관계도 (ERD)

```
users
├── calendars (1:N)
│   ├── events (1:N)
│   └── calendar_permissions (1:N)
├── tasks (1:N)
├── organization_users (N:M via organizations)
├── team_users (N:M via teams)
├── ai_conversations (1:N)
└── ai_user_preferences (1:1)

organizations
├── organization_users (1:N)
├── teams (1:N)
└── organization_invitations (1:N)

teams
└── team_users (1:N)

ai_conversations
└── ai_messages (1:N)
```

---

## 주요 인덱스 전략

### 성능 최적화를 위한 인덱스

1. **외래 키 인덱스**: 모든 외래 키에 인덱스 생성
2. **조회 빈도가 높은 컬럼**: `start_time`, `end_time`, `due_date`, `status` 등
3. **정렬이 빈번한 컬럼**: `created_at`, `last_message_at` 등
4. **검색 조건으로 자주 사용되는 컬럼**: `email`, `intent` 등

---

## 제약 조건 및 무결성

### CASCADE 삭제
- 사용자 삭제 시 관련 데이터 자동 삭제
- 캘린더 삭제 시 이벤트 자동 삭제
- 조직 삭제 시 관련 팀, 멤버십, 초대 자동 삭제

### SET NULL 삭제
- 캘린더 삭제 시 태스크의 `calendar_id`는 NULL로 설정
- 대화 삭제 시 로그의 `conversation_id`는 NULL로 설정

### UNIQUE 제약
- `users.email`: 이메일 중복 방지
- `calendar_permissions(calendar_id, user_id)`: 중복 권한 방지
- `organization_invitations.token`: 토큰 고유성 보장

---

## 마이그레이션 순서

1. `001_create_tables.sql` - 기본 테이블 생성
2. `002_add_role_to_users.sql` - 사용자 역할 추가
3. `003_insert_default_users.sql` - 기본 사용자 데이터
4. `004_create_organizations.sql` - 조직 및 팀 관련 테이블
5. `005_create_tasks.sql` - 태스크 테이블
6. `006_create_ai_conversations.sql` - AI 어시스턴트 관련 테이블

---

## 참고사항

- 모든 테이블은 UUID를 기본 키로 사용
- 타임스탬프는 `TIMESTAMPTZ` (타임존 포함) 사용
- JSONB 타입을 활용하여 유연한 메타데이터 저장
- 외래 키는 명시적으로 CASCADE 또는 SET NULL 정책 설정
- 인덱스는 조회 성능을 고려하여 전략적으로 배치

---

**최종 업데이트**: 2024년 (마이그레이션 파일 기준)

