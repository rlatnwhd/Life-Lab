# 생활 실험실 · Life Lab

프로젝트3 기획서를 바탕으로 기존 식품 비교 프로젝트를 교체한 개인 A/B 생활 실험 웹앱입니다.

## 실행

`npm install` 후 `npm run dev`를 실행하고 터미널의 로컬 주소로 접속하세요.

- `npm run check`: TypeScript 검사
- `npm test`: 실험 계산 로직 검증
- `npm run build`: 프로덕션 빌드
- `npm run preview`: 빌드 미리보기
- `npm run test:rules`: 로컬 Firestore 에뮬레이터에서 보안 규칙 검증
- `npm run test:cloud-browser`: 로컬 Auth·Firestore 및 Chrome에서 계정별 저장 흐름 검증
- `npm run test:account-flow`: 테스트 계정으로 탈퇴 경고·취소·데이터와 계정 삭제 검증

## 구현 기능

로그인 전 소개 화면과 로그인 후 실험실 홈, 나의 실험, 결과 비교, 사용 가이드를 제공합니다. 2단계 실험 생성, 날짜별 A/B 교차 배정, 일일 수치·메모 기록과 수정, 진행률, 조건별 평균과 추세 그래프, 기록 표, CSV 다운로드, 실험 삭제를 구현했습니다. 소개 화면의 예시는 읽기 전용이며 사용자 계정에 저장되지 않습니다.

기본 본문은 16px 안팎으로 표시하고 핵심 정보는 짙은 색으로 강조합니다. 별도의 화면 설정 메뉴는 제거했으며 기기의 동작 줄이기 설정은 따릅니다. 모바일 주간 실험표는 키보드로 포커스할 수 있는 가로 스크롤 영역입니다. Google 로그인에는 `icons/google.png` 원본을 사용하며 빌드 시 이미지도 함께 묶습니다.

계정 메뉴의 로그아웃 아래에 탈퇴하기가 있습니다. 두 단계 경고, ‘탈퇴’ 직접 입력과 삭제 동의, Google 재인증을 거친 뒤 해당 UID의 실험 문서를 먼저 삭제하고 Firebase Auth 계정을 삭제합니다. 실제 Google 계정 자체는 삭제하지 않습니다. 두 서비스 간 삭제는 원자적이지 않으므로 중간 실패 시 남은 작업을 안내합니다. 브라우저에 남아 있는 이전 버전의 로컬 기록이나 이미 내려받은 CSV 파일은 서버 계정 삭제 범위에 포함되지 않습니다.

## 저장 및 배포

Firebase 프로젝트 `life-lab-4fbcc`에 Google 로그인과 Cloud Firestore를 연결했습니다. 개발 화면은 `http://localhost:5173`에서 여세요.

로그인 전에는 서비스 소개, 읽기 전용 실험 캘린더·결과 예시와 이용 방법을 제공합니다. 예시 데이터는 별도로 생성하며 브라우저의 개인 기록을 표시하거나 변경하지 않습니다. 실험 생성·기록·수정·삭제·내 결과 확인은 로그인 후 사용할 수 있습니다.

로그인 후 홈 상단은 개인 대시보드입니다. 사용자 이름, 오늘 남은 기록과 완료 현황, 이번 주의 실제 기록 수를 보여줍니다. 기록 이어가기는 미기록 실험을 바로 열고, 신규 사용자와 오늘 기록을 마친 사용자에게는 각각 실험 만들기와 결과 확인을 안내합니다.

로그인하면 `/users/{uid}/experiments/{experimentId}` 경로의 본인 실험만 불러옵니다. 실험과 날짜별 기록은 계정에 저장되어 다른 기기에서도 확인할 수 있습니다. 이전 버전에서 브라우저에 저장한 실험은 로그인 후 가져오기 버튼으로 직접 옮길 수 있으며, 예시 데이터는 제외합니다. 같은 ID가 이미 존재하면 덮어쓰지 않습니다. 로그아웃하면 소개 화면으로 돌아오고 기존 브라우저 기록은 보존됩니다.

각 실험 문서의 `entries`는 날짜별 맵으로 저장합니다. 일일 기록은 해당 날짜 필드만 갱신해 다른 날짜의 동시 기록을 보존합니다. 저장 실패 시 입력 창을 닫지 않고 오류를 안내합니다.

### Firebase 콘솔 설정

1. Authentication에서 Google 제공업체를 사용 설정합니다.
2. 승인된 도메인에 `localhost`와 실제 배포 도메인을 등록합니다.
3. Firestore Database를 생성합니다.
4. **Firestore → 규칙**에 [public/firestore.rules](public/firestore.rules)의 전체 내용을 붙여 넣고 게시합니다. 웹의 권한 오류 안내에서도 규칙을 복사할 수 있습니다.

로컬 웹 실행 후 `http://localhost:5173/firebase-setup.html`에서 규칙 복사와 콘솔 이동을 순서대로 진행할 수 있습니다.

CLI 인증이 유효하면 `firebase deploy --only firestore:rules --project life-lab-4fbcc`로 규칙을 게시할 수 있습니다. 이 작업에서 실제 프로젝트의 규칙 게시 및 실제 Google 계정 로그인 검증은 완료하지 못했습니다. 프로젝트 조회 시 기존 CLI 인증이 HTTP 401로 거부되었습니다.

웹용 Firebase 설정은 `src/firebase.ts`에 있습니다. 서비스 계정이나 관리자 비공개 키는 사용하지 않습니다. Google Analytics는 활성화하지 않았습니다.

### 검증

에뮬레이터 검증에는 Firebase CLI, Java, Chrome이 필요합니다. 테스트는 `demo-life-lab` 프로젝트와 로컬 에뮬레이터만 사용합니다. 실제 Firebase 프로젝트에 테스트 데이터를 쓰지 않습니다. 모델 테스트는 `npm test`만으로 실행할 수 있습니다.

React 19, TypeScript, Vite, lucide-react를 사용합니다. 차트와 삽화는 SVG로 구성했습니다. 외부 AI API는 필요하지 않습니다. Google Fonts 연결이 불가능하면 시스템 글꼴로 표시됩니다.

### Vercel 배포

1. https://vercel.com/new 에서 GitHub로 로그인하고 `rlatnwhd/Life-Lab` 저장소를 Import합니다.
2. Root Directory는 저장소 최상위(`./`)로 둡니다. `vercel.json`에 Vite, `npm ci`, `npm run build`, 출력 폴더 `dist`가 설정되어 있습니다.
3. Deploy를 누르고 빌드가 끝나면 생성된 `프로젝트이름.vercel.app` 주소를 확인합니다. 현재 Firebase 웹 설정은 코드에 있으므로 Vercel 환경 변수는 따로 입력하지 않습니다.
4. Firebase 콘솔의 Authentication → 설정 → 승인된 도메인 → 도메인 추가에서 배포 주소의 호스트만 입력합니다. 예: `life-lab.vercel.app` (`https://`와 경로 제외). 실제로 발급받은 주소를 사용해야 Google 로그인이 동작합니다.
5. 배포 사이트에서 Google 로그인, 실험 생성, 기록 저장과 새로고침 후 유지 여부를 확인합니다. 저장 권한 오류가 있으면 Firestore 규칙에 `public/firestore.rules` 내용을 게시합니다.

이후 연결된 GitHub 기본 브랜치에 push하면 Vercel이 자동 배포합니다. 실제 Vercel 배포는 아직 수행하지 않았습니다.
