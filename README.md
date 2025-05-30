# Dead Man’s Switch

![Build-Backend](https://img.shields.io/github/actions/workflow/status/raghavsikaria/dead_mans_switch/.github/workflows/deploy.yml)
![Build-Frontend](https://img.shields.io/github/actions/workflow/status/raghavsikaria/dead_mans_switch/.github/workflows/deploy-frontend.yml)
![License](https://img.shields.io/github/license/raghavsikaria/dead_mans_switch)
![Last Commit](https://img.shields.io/github/last-commit/raghavsikaria/dead_mans_switch)
![Firebase](https://img.shields.io/badge/deployed-Firebase-brightgreen)
![AWS](https://img.shields.io/badge/AWS-cloud-orange)
![Terraform](https://img.shields.io/badge/Terraform-IaC-purple)

Well, this tool, is more like my personal safety device. And for crazy people like me :). I just disappear when I am traveling. So I created this privacy-focused safety automation tool that automatically sends alert emails to emergency contacts if the user fails to check in within a specified time. This project leverages serverless architecture and modern cloud technologies to ensure high availability, reliability, and security.

## Functional Requirements

- Google-based sign-in/sign-up (via Firebase Authentication)
- User must **check in** periodically (e.g., every 72 hours)
- On each login, user is automatically marked as checked-in
- Users can:
  - Save threshold hours
  - Provide a list of emergency contact emails
  - View their last check-in time and when the next alert will be triggered
  - Delete their account and clear data
- If the user fails to check in within threshold time:
  - An alert email is sent to listed contacts
  - Alert is sent only once per missed check-in

## Project Structure

```
dead_mans_switch/
├── .github/
│   └── workflows/ (GitHub Actions)
│       ├── deploy-front.yml
│       └── deploy.yml
├── backend/
│   └── DeadManSwitchChecker/
│   └── DeadManSwitchHandler/
├── frontend/
│   ├── public/
│   └── src/
│       ├── app/
│       ├── components/
│       │   └── ui/
│       └── lib/
│   ├── .firebaserc
│   └──firebase.json
├── infra/
│   └── main.tf (Terraform IaC)
└── README.md
```

## Technologies Used

### Backend
- **AWS Lambda** – for executing core logic (handler and checker)
- **API Gateway** – for exposing secured REST APIs for our Lambdas
- **DynamoDB** – NoSQL storage for user configs and check-in logs
- **Amazon SES** – for sending alert emails
- **Terraform** – Infrastructure as Code (IaC) for provisioning AWS resources

### Frontend
- **React with Next.js** – modern React framework for SSR and SPA
- **Tailwind CSS & ShadCN/UI** – sleek and responsive UI
- **Firebase Auth** – handles Google Sign-In integration

**NOTE:** Special thanks to ChatGPT for helping me out with Front-end. I am a front-end noob, but AI is crazy these days :) Good experiment!

### CI/CD
- **GitHub Actions** – for automating backend and frontend deployments
- **Firebase Hosting** – to serve the frontend as a static site
