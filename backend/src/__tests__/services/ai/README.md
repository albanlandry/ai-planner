# AI Core Features Unit Tests

이 디렉토리에는 AI 핵심 기능에 대한 단위 테스트가 포함되어 있습니다.

## 테스트 파일 목록

### 1. `intentRouter.test.js`
Intent Router 서비스에 대한 테스트

**테스트 커버리지:**
- OpenAI 기반 intent classification
- Fallback keyword-based classification
- 모든 intent 타입 분류 (CREATE_EVENT, CREATE_TASK, QUERY_*, etc.)
- JSON 파싱 오류 처리
- OpenAI API 오류 처리
- Intent validation 및 default 처리

**실행 방법:**
```bash
npm test -- intentRouter.test.js
```

### 2. `nlpEventService.test.js`
Natural Language Event Creation 서비스에 대한 테스트

**테스트 커버리지:**
- Event details extraction from natural language
- Date/time parsing (ISO 및 자연어)
- Duration calculation
- Missing field detection
- Calendar validation
- Primary calendar fallback
- Event creation 성공/실패 시나리오

**실행 방법:**
```bash
npm test -- nlpEventService.test.js
```

### 3. `nlpTaskService.test.js`
Natural Language Task Creation 서비스에 대한 테스트

**테스트 커버리지:**
- Task details extraction from natural language
- Priority inference (urgent, high, medium, low)
- Due date parsing
- Status validation
- Priority validation
- Calendar association
- Task creation 성공/실패 시나리오

**실행 방법:**
```bash
npm test -- nlpTaskService.test.js
```

### 4. `queryProcessor.test.js`
Query Processing 서비스에 대한 테스트

**테스트 커버리지:**
- Date range extraction (today, tomorrow, this week, next week, etc.)
- Calendar query processing
- Task query processing
- Event/task filtering by date range
- Empty results handling
- Result limiting (10 items max)
- OpenAI integration
- Error handling

**실행 방법:**
```bash
npm test -- queryProcessor.test.js
```

### 5. `schedulingService.test.js`
Smart Scheduling 서비스에 대한 테스트

**테스트 커버리지:**
- Conflict detection
- Available slot finding
- Meeting time suggestions
- Preferred hours support
- Duration handling
- Edge cases (end-to-start overlap, past dates)
- Result limiting (10 suggestions max)

**실행 방법:**
```bash
npm test -- schedulingService.test.js
```

## 전체 테스트 실행

모든 AI 서비스 테스트 실행:
```bash
npm test -- services/ai
```

코드 커버리지 포함:
```bash
npm test -- --coverage services/ai
```

## Mock 설정

모든 테스트는 다음을 mock합니다:
- `openaiService` - OpenAI API 호출
- `Event` model - 데이터베이스 이벤트 조회
- `Task` model - 데이터베이스 작업 조회
- `Calendar` model - 데이터베이스 캘린더 조회
- `chrono-node` - 날짜 파싱 (선택적)

## 테스트 구조

각 테스트 파일은 다음 구조를 따릅니다:
```
describe('Service Name', () => {
  beforeEach(() => {
    // Reset mocks
  });

  describe('Method Name', () => {
    it('should handle success case', async () => {
      // Arrange
      // Act
      // Assert
    });

    it('should handle error case', async () => {
      // Error scenario
    });
  });
});
```

## 주의사항

1. **OpenAI API Key 불필요**: 모든 OpenAI 호출은 mock되어 실제 API 키가 필요 없습니다.
2. **데이터베이스 불필요**: 모든 데이터베이스 호출은 mock되어 실제 DB 연결이 필요 없습니다.
3. **독립적인 테스트**: 각 테스트는 독립적으로 실행되며, 다른 테스트에 영향을 주지 않습니다.

## 테스트 통계

예상 테스트 수:
- `intentRouter.test.js`: ~10개 테스트
- `nlpEventService.test.js`: ~15개 테스트
- `nlpTaskService.test.js`: ~15개 테스트
- `queryProcessor.test.js`: ~12개 테스트
- `schedulingService.test.js`: ~15개 테스트

**총 약 67개 테스트**

## 커버리지 목표

목표 커버리지: **80% 이상**

각 서비스의 주요 기능:
- ✅ Happy path
- ✅ Error handling
- ✅ Edge cases
- ✅ Validation
- ✅ Fallback scenarios

