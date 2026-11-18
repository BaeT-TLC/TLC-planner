# TLC 플래너 공개 사이트

운영 소스 기준: 비공개 개발 저장소의 검증 커밋 ec59f644db880c72b2120293e923f56c576697dd.
개발 검증: 시간 2개, Firestore 규칙 8개, Chromium 브라우저 시나리오 1개 통과.
이 저장소에는 플래너 웹 코드와 정적 빌드/Pages 워크플로만 포함합니다. 기존 preview, 진단 앱 및 학생 데이터는 포함하지 않습니다.

Node 22에서 npm install 후 npm run build. 배포 파일은 dist에 생성합니다.
Firebase SDK를 번들에 포함합니다. 운영 파일에서 에뮬레이터 테스트 도우미가 제거되는지 검사합니다.
main 변경 시 Pages 자동 배포를 시도합니다. Pages 자동 활성화 권한 오류가 나오면 Settings > Pages > Build and deployment > Source를 GitHub Actions로 설정한 후 Actions의 Deploy TLC planner를 다시 실행합니다.

예상 사이트 주소: https://baet-tlc.github.io/TLC-planner/
실제 배포 성공은 GitHub Actions의 Deploy 결과로 확인해야 합니다.
Google 로그인 전에 Firebase Authentication > Settings > Authorized domains에 baet-tlc.github.io를 등록해야 합니다.
Firebase Spark를 유지하며 유료 서버, Cloud Functions, 결제, 요금제 업그레이드를 사용하지 않습니다.
웹 Firebase apiKey는 공개 웹 설정이며 보안 비밀이 아닙니다. 학생 데이터 접근은 Firestore 규칙으로 제한합니다.
플래너 데이터 경로는 plannerStudents/{email}입니다. 기존 students 문서는 변경하지 않습니다.
학생은 코치가 새 플래너에서 이메일을 등록한 후 이용할 수 있습니다.
Gmail 기능은 미연결 샘플이며 실제 메일을 읽거나 보내지 않습니다.
실제 Google OAuth와 운영 Firestore 저장은 배포 후 별도로 확인해야 합니다.
