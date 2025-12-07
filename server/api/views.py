"""
API Views for AI Comparator
"""
import json
from datetime import datetime
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from groq import Groq
import google.generativeai as genai
from .models import QueryHistory

User = get_user_model()


def get_authenticated_user(request):
    """Helper function to get authenticated user from JWT token"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header.split(' ')[1]
        from rest_framework_simplejwt.tokens import AccessToken
        access_token = AccessToken(token)
        user_id = access_token['user_id']
        return User.objects.get(id=user_id)
    except Exception:
        return None


def get_groq_response(prompt):
    """Get response from Groq API"""
    if not settings.GROQ_API_KEY:
        return {
            'model': 'Groq',
            'response': 'API key not configured',
            'error': 'Please configure GROQ_API_KEY in .env file'
        }
    
    try:
        client = Groq(api_key=settings.GROQ_API_KEY)
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
        )
        return {
            'model': 'Groq',
            'response': completion.choices[0].message.content,
            'timestamp': datetime.now().isoformat(),
        }
    except Exception as e:
        print(f'Groq error: {str(e)}')
        return {
            'model': 'Groq',
            'error': str(e),
            'response': 'Failed to get response from Groq',
        }


def get_gemini_response(prompt):
    """Get response from Gemini API"""
    if not settings.GEMINI_API_KEY:
        return {
            'model': 'Gemini',
            'response': 'API key not configured',
            'error': 'Please configure GEMINI_API_KEY in .env file'
        }
    
    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-flash-latest')
        result = model.generate_content(prompt)
        return {
            'model': 'Gemini',
            'response': result.text,
            'timestamp': datetime.now().isoformat(),
        }
    except Exception as e:
        print(f'Gemini error: {str(e)}')
        return {
            'model': 'Gemini',
            'error': str(e),
            'response': 'Failed to get response from Gemini',
        }


# API Endpoints
@require_http_methods(["GET"])
def health_check(request):
    """Health check endpoint"""
    return JsonResponse({
        'status': 'ok',
        'message': 'AI Comparator API is running'
    })

# for testing purposes and separate endpoints for each model
@csrf_exempt
@require_http_methods(["POST"])
def groq_view(request):
    """Groq endpoint"""
    try:
        data = json.loads(request.body)
        prompt = data.get('prompt')
        
        if not prompt:
            return JsonResponse({'error': 'Prompt is required'}, status=400)
        
        result = get_groq_response(prompt)
        
        # Save to history if user is authenticated
        user = get_authenticated_user(request)
        if user and not result.get('error'):
            QueryHistory.objects.create(
                user=user,
                prompt=prompt,
                response_groq=result.get('response'),
                mode='groq'
            )
        
        status = 500 if result.get('error') else 200
        return JsonResponse(result, status=status)
        
    except Exception as e:
        return JsonResponse({
            'error': 'Failed to get response from Groq',
            'details': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def gemini_view(request):
    """Gemini endpoint"""
    try:
        data = json.loads(request.body)
        prompt = data.get('prompt')
        
        if not prompt:
            return JsonResponse({'error': 'Prompt is required'}, status=400)
        
        result = get_gemini_response(prompt)
        
        # Save to history if user is authenticated
        user = get_authenticated_user(request)
        if user and not result.get('error'):
            QueryHistory.objects.create(
                user=user,
                prompt=prompt,
                response_gemini=result.get('response'),
                mode='gemini'
            )
        
        status = 500 if result.get('error') else 200
        return JsonResponse(result, status=status)
        
    except Exception as e:
        return JsonResponse({
            'error': 'Failed to get response from Gemini',
            'details': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def compare_view(request):
    """Compare endpoint - gets responses from all AIs"""
    try:
        data = json.loads(request.body)
        prompt = data.get('prompt')
        
        if not prompt:
            return JsonResponse({'error': 'Prompt is required'}, status=400)
        
        # Get responses from all models
        results = {
            'groq': get_groq_response(prompt),
            'gemini': get_gemini_response(prompt),
        }
        
        # Save to history if user is authenticated
        user = get_authenticated_user(request)
        if user and not results['groq'].get('error') and not results['gemini'].get('error'):
            QueryHistory.objects.create(
                user=user,
                prompt=prompt,
                response_groq=results['groq'].get('response'),
                response_gemini=results['gemini'].get('response'),
                mode='both'
            )
        
        return JsonResponse(results)
        
    except Exception as e:
        print(f'Compare error: {str(e)}')
        return JsonResponse({
            'error': 'Failed to compare AI responses',
            'details': str(e)
        }, status=500)


def get_ai_comparison_rubric(prompt, groq_response, gemini_response):
    comparison_prompt = f"""You are an expert AI evaluator. Compare these two AI responses to the same prompt and provide a detailed evaluation.

Original Prompt: {prompt}

Response A (Groq/Llama 3.3): {groq_response}

Response B (Gemini): {gemini_response}

Please evaluate both responses using the following rubric (score each criterion from 1-10):

1. **Accuracy**: How factually correct and reliable is the information?
2. **Relevance**: How well does it address the prompt?
3. **Clarity**: How clear and easy to understand is the response?
4. **Completeness**: How thorough and comprehensive is the answer?
5. **Usefulness**: How practical and helpful is the response?

Provide your evaluation in the following JSON format:
{{
    "response_a": {{
        "accuracy": <score>,
        "relevance": <score>,
        "clarity": <score>,
        "completeness": <score>,
        "usefulness": <score>,
        "total": <sum of all scores>,
        "strengths": ["strength 1", "strength 2"],
        "weaknesses": ["weakness 1", "weakness 2"]
    }},
    "response_b": {{
        "accuracy": <score>,
        "relevance": <score>,
        "clarity": <score>,
        "completeness": <score>,
        "usefulness": <score>,
        "total": <sum of all scores>,
        "strengths": ["strength 1", "strength 2"],
        "weaknesses": ["weakness 1", "weakness 2"]
    }},
    "overall_comparison": "Brief summary of which is better and why",
    "recommendation": "Which response would you recommend and why?"
}}"""

    try:
        # use Gemini for comparison and parse JSON
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-flash-latest')
        result = model.generate_content(comparison_prompt)

        response_text = result.text
        if "```json" in response_text:
            response_text = response_text.split("```json")[1].split("```")[0].strip()
        elif "```" in response_text:
            response_text = response_text.split("```")[1].split("```")[0].strip()
        
        rubric = json.loads(response_text)
        return {
            'success': True,
            'rubric': rubric,
            'evaluator': 'Gemini Flash'
        }
    except Exception as e:
        print(f'Rubric generation error: {str(e)}')
        # fallback: try with Groq
        try:
            client = Groq(api_key=settings.GROQ_API_KEY)
            completion = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": comparison_prompt}],
                max_tokens=2000,
            )
            response_text = completion.choices[0].message.content
            
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            rubric = json.loads(response_text)
            return {
                'success': True,
                'rubric': rubric,
                'evaluator': 'Groq Llama 3.3'
            }
        except Exception as e2:
            print(f'Fallback rubric error: {str(e2)}')
            return {
                'success': False,
                'error': 'Failed to generate comparison rubric',
                'details': str(e2)
            }


@csrf_exempt
@require_http_methods(["POST"])
def compare_with_rubric_view(request):
    try:
        data = json.loads(request.body)
        prompt = data.get('prompt')
        
        if not prompt:
            return JsonResponse({'error': 'Prompt is required'}, status=400)
        
        # get responses from both models
        groq_result = get_groq_response(prompt)
        gemini_result = get_gemini_response(prompt)
        
        if groq_result.get('error') or gemini_result.get('error'):
            return JsonResponse({
                'error': 'Failed to get responses from one or both AI models',
                'groq': groq_result,
                'gemini': gemini_result
            }, status=500)
        
        # get AI-based comparison and rubric
        rubric_result = get_ai_comparison_rubric(
            prompt,
            groq_result.get('response'),
            gemini_result.get('response')
        )
        
        # prepare response and save to history
        response_data = {
            'prompt': prompt,
            'responses': {
                'groq': groq_result,
                'gemini': gemini_result
            },
            'evaluation': rubric_result
        }

        user = get_authenticated_user(request)
        if user and rubric_result.get('success'):
            QueryHistory.objects.create(
                user=user,
                prompt=prompt,
                response_groq=groq_result.get('response'),
                response_gemini=gemini_result.get('response'),
                mode='compare_with_rubric'
            )
        
        return JsonResponse(response_data)
        
    except Exception as e:
        print(f'Compare with rubric error: {str(e)}')
        return JsonResponse({
            'error': 'Failed to compare AI responses with rubric',
            'details': str(e)
        }, status=500)



# auth endpoints
@csrf_exempt
@require_http_methods(["POST"])
def register_view(request):
    """User registration endpoint"""
    # get data from request body and validate it
    try:
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')
        username = data.get('username')
        
        if not email or not password:
            return JsonResponse({
                'error': 'Email and password are required'
            }, status=400)
        
        if not username:
            return JsonResponse({
                'error': 'Username is required'
            }, status=400)
        
        if User.objects.filter(email=email).exists():
            return JsonResponse({
                'error': 'Email already exists'
            }, status=400)
        
        # create user, jtw token, and return
        user = User.objects.create_user(
            email=email,
            password=password,
            username=username
        )
        refresh = RefreshToken.for_user(user)
        
        return JsonResponse({
            'message': 'User registered successfully',
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username,
            },
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }
        }, status=201)
        
    except Exception as e:
        print(f'Registration error: {str(e)}')
        return JsonResponse({
            'error': 'Registration failed',
            'details': str(e)
        }, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def login_view(request):
    """User login endpoint"""
    try:
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')
        
        # Validation
        if not email or not password:
            return JsonResponse({
                'error': 'Email and password are required'
            }, status=400)
        
        # Get user by email
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return JsonResponse({
                'error': 'Invalid email or password'
            }, status=401)
        
        # Check password
        if not user.check_password(password):
            return JsonResponse({
                'error': 'Invalid email or password'
            }, status=401)
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return JsonResponse({
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username,
            },
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }
        })
        
    except Exception as e:
        print(f'Login error: {str(e)}')
        return JsonResponse({
            'error': 'Login failed',
            'details': str(e)
        }, status=500)


@require_http_methods(["GET"])
def get_user_view(request):
    """Get current user info (requires JWT authentication)"""
    try:
        user = get_authenticated_user(request)
        if not user:
            return JsonResponse({
                'error': 'Authentication required'
            }, status=401)
        
        return JsonResponse({
            'user': {
                'id': user.id,
                'email': user.email,
            }
        })
        
    except Exception as e:
        print(f'Get user error: {str(e)}')
        return JsonResponse({
            'error': 'Failed to get user info',
            'details': str(e)
        }, status=401)


@require_http_methods(["GET"])
def history_view(request):
    """Get user's query history (last 5 queries)"""
    try:
        user = get_authenticated_user(request)
        if not user:
            return JsonResponse({
                'error': 'Authentication required'
            }, status=401)
        
        # Get last 5 queries for the user
        queries = QueryHistory.objects.filter(user=user)[:5]
        
        history = [{
            'id': q.id,
            'prompt': q.prompt,
            'mode': q.mode,
            'created_at': q.created_at.isoformat(),
            'responses': {
                'groq': q.response_groq,
                'gemini': q.response_gemini,
            }
        } for q in queries]
        
        return JsonResponse({'history': history})
        
    except Exception as e:
        print(f'History error: {str(e)}')
        return JsonResponse({
            'error': 'Failed to get history',
            'details': str(e)
        }, status=500)


@csrf_exempt
def profile_view(request):
    """
    RESTful endpoint for user profile
    GET - Read profile
    PUT - Update profile  
    DELETE - Delete profile/account
    """
    try:
        user = get_authenticated_user(request)
        if not user:
            return JsonResponse({
                'error': 'Authentication required'
            }, status=401)
        
        if request.method == 'GET':
            # Read profile
            return JsonResponse({
                'profile': {
                    'id': user.id,
                    'email': user.email,
                    'username': user.username,
                    'first_name': user.first_name or '',
                    'last_name': user.last_name or '',
                    'phone': user.phone or '',
                    'location': user.location or '',
                    'bio': user.bio or '',
                }
            })
        
        elif request.method == 'PUT':
            # Update profile
            data = json.loads(request.body)
            
            # Update profile fields
            if 'first_name' in data:
                user.first_name = data['first_name']
            if 'last_name' in data:
                user.last_name = data['last_name']
            if 'phone' in data:
                user.phone = data['phone']
            if 'location' in data:
                user.location = data['location']
            if 'bio' in data:
                user.bio = data['bio']
            if 'username' in data:
                user.username = data['username']
            
            user.save()
            
            return JsonResponse({
                'message': 'Profile updated successfully',
                'profile': {
                    'id': user.id,
                    'email': user.email,
                    'username': user.username,
                    'first_name': user.first_name or '',
                    'last_name': user.last_name or '',
                    'phone': user.phone or '',
                    'location': user.location or '',
                    'bio': user.bio or '',
                }
            })
        
        elif request.method == 'DELETE':
            # Delete account
            user_email = user.email
            user.delete()
            
            return JsonResponse({
                'message': 'Account deleted successfully',
                'email': user_email
            }, status=200)
        
        else:
            return JsonResponse({
                'error': 'Method not allowed'
            }, status=405)
        
    except Exception as e:
        print(f'Profile error: {str(e)}')
        return JsonResponse({
            'error': f'Failed to {request.method.lower()} profile',
            'details': str(e)
        }, status=500)
