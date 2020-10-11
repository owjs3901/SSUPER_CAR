# 2020 제 18회 임베디드 소프트웨어 경진대회   
- webOS 부문

## 팀명 : SSU퍼카   
 작품명 : BAVIS - 생체인증 및 생체신호를 활용한 AI 스마트카 솔루션   

## 시연영상
<!--[![Watch the video](https://img.youtube.com/vi/3Bf1bq5_Kco/hqdefault.jpg)](https://www.youtube.com/watch?v=3Bf1bq5_Kco)-->

## 구성원
- **[오정민](https://github.com/owjs3901)(팀장)**   
> 프로젝트 매니저, 네트워크 서버 개발   
TCP 서버 및 클라이언트 구현   
HTTP 서버 구현   
FIDO 서버 구현   
BlueTooth 통신 제어   
App 데이터 저장소 관리(redux)   

- **[김희연](https://github.com/yyyy1221)(팀원)**
> UI/UX 디자인   
사람인식 AI 모델 구축   
비접촉 체온 측정 센서 제어   
 
- **[심효민](https://github.com/shimhm)(팀원)**
> 라인트레이서 구동 및 센싱 제어   
Raspberry Pi와 Arduino UNO 블루투스 통신   
온습도 센서와 비접촉 체온 측정 센서 제어   

- **[허준범](https://github.com/EasyBAMM)(팀원)**
> Enact 클라이언트 개발   
App 데이터 저장소 관리   
App 애니메이팅 및 UI/UX 개발   

## 개발 개요
- 자동차 도난 사고는 매년 꾸준히 발생하는 사건이다. 특히 최근 미성년자들이 부모님의 자동차를 훔쳐 불법운행하는 사건들이 많이 발생하였다. 이는 자동차의 경우, 시동을 걸기 위한 안전장치가 자동차 키만으로 이루어지기 때문에 도난에 취약하다는 특징으로부터 발생한 문제이다. 스마트카 생체인증 보안 솔루션은 시동을 켤 때, 생체 인증을 하여 신뢰 가능한 운전자만이 시동을 걸고 자동차의 운행을 할 수 있도록 하여 자동차의 보안을 강화한다.    

- 인포테인먼트 시스템의 목적은 자동차의 운전자를 포함한 탑승자의 편의와 안전을 극대화하는 것이다. 편의성도 중요하지만, 탑승자의 안전이 최우선적으로 중요하다고 여겨 탑승자의 안전성을 높일 수 있는 인포테인먼트 시스템인 운전자 모니터링 AI 시스템을 계획하였다. 이는 자동차가 움직이면 외부에서 물리적으로 자동차의 움직임을 통제하기 힘들기 때문에 자동차가 움직이면 안 되는 상황, 즉 차량에 운전자가 없는 상황을 판단해 자동차의 움직임을 제어한다.   

- IT 기술이 발전함에 따라 차량 인포테인먼트 시스템 또한 발전해 가고 있다. 이에 따라 자동차의 운전자를 포함한 탑승자의 편의와 안전이 중요시되고 있다. 따라서 탑승자의 편의성을 증대시키기 위해 차량 탑승자의 요구에 따라 수동적으로 제공되는 편의 서비스가 아닌 그보다 한발 더 나아가 탑승자의 상태와 차량 내부의 상태를 실시간으로 확인하여 능동적으로 탑승자의 이상 상황을 판단하거나 차량 내부의 상태를 센싱하여 그 정보를 토대로 차량의 시스템을 제어하여 차량 내부를 적정한 상태로 유지시켜 탑승자의 편의를 제공하는 케어 솔루션을 기획하였다. 

## UI

## 개발환경
- Hardware 구성
![Alt text](/readme_img/하드웨어구성표.png)   

- Raspberry Pi 4(Rapbian 기반) 회로도
![Alt text](/readme_img/RPI4_1.png)   

- Arduino Uno, Line Tracer 회로도
![Alt text](/readme_img/RPI4_2.png)   

## 아키텍처
- Service Architecture   
![Alt text](/readme_img/service_1.png)   

- Server Architecture   
![Alt text](/readme_img/server_1.png)   


## 흐름도
![Alt text](/readme_img/flowchart.png)

