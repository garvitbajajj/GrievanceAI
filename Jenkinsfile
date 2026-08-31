pipeline {
    agent any

    environment {
        // ── Isolates Jenkins containers from local dev stack ──────
        // Local dev uses: 8000, 5000, 3000
        // Jenkins CI uses: 9000, 6000, 4000  (defined in docker-compose.ci.yml)
        COMPOSE_PROJECT_NAME = "bhashaflow-ci"
        COMPOSE_FILE         = "docker-compose.yml:docker-compose.ci.yml"

        // ── Credentials ───────────────────────────────────────────
        JWT_SECRET           = credentials('BHASHAFLOW_JWT_SECRET')
        SARVAM_API_KEY       = credentials('BHASHAFLOW_SARVAM_KEY')
        MONGO_URI            = credentials('BHASHAFLOW_MONGO_URI')
        GEMINI_API_KEY       = credentials('BHASHAFLOW_GEMINI_KEY')
        GOOGLE_CLIENT_ID     = credentials('BHASHAFLOW_GOOGLE_CLIENT_ID')
        GOOGLE_CLIENT_SECRET = credentials('BHASHAFLOW_GOOGLE_CLIENT_SECRET')
        GMAIL_USER           = credentials('BHASHAFLOW_GMAIL_USER')
        GMAIL_PASS           = credentials('BHASHAFLOW_GMAIL_PASS')
        TECH_LEAD_EMAIL      = credentials('BHASHAFLOW_TECH_LEAD_EMAIL')
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        stage('Cleanup Previous CI Run') {
            steps {
                // Only kills bhashaflow-ci containers — never touches local dev stack
                sh 'docker-compose down --remove-orphans --volumes || true'
            }
        }

        stage('Prepare Environment') {
            steps {
                sh '''
                echo "MONGO_URI=${MONGO_URI}"                               > .env
                echo "JWT_SECRET=${JWT_SECRET}"                            >> .env
                echo "PORT=5000"                                           >> .env
                echo "SARVAM_API_KEY=${SARVAM_API_KEY}"                    >> .env
                echo "GEMINI_API_KEY=${GEMINI_API_KEY}"                    >> .env
                echo "GMAIL_USER=${GMAIL_USER}"                            >> .env
                echo "GMAIL_PASS=${GMAIL_PASS}"                            >> .env
                echo "GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}"                >> .env
                echo "VITE_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}"           >> .env
                echo "GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}"        >> .env
                echo "TECH_LEAD_EMAIL=${TECH_LEAD_EMAIL}"                  >> .env
                echo "FRONTEND_URL=http://localhost:4000"                  >> .env
                echo "VITE_BACKEND_URL=http://localhost:6000"              >> .env
                '''
            }
        }

        stage('Build Docker Images') {
            steps {
                sh 'docker-compose build'
            }
        }

        stage('Test & Run') {
            steps {
                sh 'docker-compose up -d'
                sh 'sleep 10'
                sh 'docker-compose ps'
                sh '''
                RUNNING=$(docker-compose ps --services --filter "status=running" | wc -l)
                if [ "$RUNNING" -lt 3 ]; then
                    echo "❌ Not all containers are running"
                    docker-compose logs
                    exit 1
                fi
                echo "✅ All containers are up"
                echo "   ai-engine → http://localhost:9000"
                echo "   backend   → http://localhost:6000"
                echo "   frontend  → http://localhost:4000"
                '''
            }
        }
    }

    post {
        always {
            // Clean up CI containers after every run
            sh 'docker-compose down --remove-orphans || true'
        }
        failure {
            emailext to: "${env.TECH_LEAD_EMAIL}",
                subject: "🚨 BhashaFlow Build Failed: ${env.JOB_NAME} [${env.BUILD_NUMBER}]",
                body: "Build #${env.BUILD_NUMBER} failed. Check: ${env.BUILD_URL}"
        }
        success {
            echo '✅ Build passed!'
        }
    }
}