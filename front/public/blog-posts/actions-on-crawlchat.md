---
title: Introducing Actions
date: 2025-09-07
description: CrawlChat Actions let chatbots call APIs to fetch data or perform tasks. Configure with URL, method, and data. Logged in analytics, executed securely on servers, with sensitive details protected.
---

Providing support from help documentation is the minimal for any support system. Often times, the chatbot requires to fetch some information from external system such as user information, real time data, etc., or to perform some kind of actions such as booking an appointment, upgrading the user to higher plan etc.

![Actions on CrawlChat](/blog-images/action/actions.png)

Now you can let the CrawlChat chatbot perform **external actions** using APIs. You can add APIs as actions to external systems such as Zendesk, Shopify, or your own application.

## What is an Action?

In simple terms, an Action is HTTP (API) request on CrawlChat. You need to provide an **URL** and a **method** so that the chatbot makes the HTTP request whenever required. You can explain about the Action in description so that the AI knows what the Action is for and when to use it.

For example, you may have user-details API on your application which takes the user email and returns the plan details. You can add it as an action and the chatbot would use the action whenever required and informs the user about their plan.

## Add an Action

![Add an action](/blog-images/action/add-action.png)

You need provide the URL and the method of the HTTP API. It uses these details while making the HTTP request. Apart from that, you need to provide a title for better experiance. Another important details you need to provide is **description**. You need to explain about this Action and this will be passed to the AI so that the AI understands better about this Action and uses it in the desired situations in a natural way.

It is needless to say that the APIs take input data as request body or query parameters based on the API method. You can configure the data to be passed as well as part of the HTTP request.

![Add an action data & headers](/blog-images/action/add-action-data.png)

For each Data item you add, you need to provide the type of the data item either **Dynamic** or **Value**. Dynamic data items are kind of placeholders and the actual value would be filled by chatbot based on the conversation with the user. For example, you may add email as a data item and explain about it in description, example, *"Customer email to fetch the plan details"*, so that the bot asks the user to provide the email and use it accordingly.

Value data items, on other hand are constant values that would be used as it is. You can use them to send API keys, or other data items whose values are constant all the time. You also need to provide the data type of the field. You can choose one from **String**, **Number**, and **Boolean**.

You can configure Headers in same way as explained above. Once you add an action, the chatbot would instantly start using it as you described it.

## Analytics

![View action analytics](/blog-images/action/action-response.png)

You can view the Actions that the chatbot performs from the Messages section. It shows if the message performed any action, if so, you can view all the details of the action such as the data it sent, the response from the API, status code and more.

This helps you in better monitoring and resolving issues if any. It also shows the number of times the Action is performed in last 7 days.

## Security

The Actions are performed from the **server** and *not from the client side*. Also, the Value type data you provide is not shared with AI in any ways and the API calls are made from the CrawlChat's *application layer (servers)* so that no sensitive information is shared with AI. Currently, the response of the API calls is shared with AI as is.

That summarises that the no sensitive information or the details about the URL is not shared with either the AI or the user and it is **secured**.